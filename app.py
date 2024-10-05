import os
import subprocess
from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///videos.db'
app.config['BASE_DIR'] = '/run/media/nisidabay/Elements'
db = SQLAlchemy(app)

class Video(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    path = db.Column(db.String(200), nullable=False)
    tags = db.Column(db.String(200))

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/folders')
def get_folders():
    folders = [f for f in os.listdir(app.config['BASE_DIR']) 
               if os.path.isdir(os.path.join(app.config['BASE_DIR'], f))]
    return jsonify(folders)

@app.route('/videos')
def get_videos():
    folder = request.args.get('folder', '')
    folder_path = os.path.join(app.config['BASE_DIR'], folder)
    videos = []
    for root, dirs, files in os.walk(folder_path):
        for file in files:
            if file.lower().endswith(('.mp4', '.avi', '.mov', '.mkv')):
                full_path = os.path.join(root, file)
                relative_path = os.path.relpath(full_path, app.config['BASE_DIR'])
                video = Video.query.filter_by(path=relative_path).first()
                if not video:
                    video = Video(title=file, path=relative_path, tags='')
                    db.session.add(video)
                videos.append({'id': video.id, 'title': video.title, 'path': video.path, 'tags': video.tags})
    db.session.commit()
    return jsonify(videos)

@app.route('/search')
def search_videos():
    query = request.args.get('q')
    videos = Video.query.filter(Video.title.contains(query) | Video.tags.contains(query)).all()
    return jsonify([{'id': v.id, 'title': v.title, 'path': v.path, 'tags': v.tags} for v in videos])

@app.route('/edit/<int:id>', methods=['PUT'])
def edit_video(id):
    video = Video.query.get(id)
    if video:
        video.title = request.form['title']
        video.tags = request.form['tags']
        db.session.commit()
        return jsonify({'success': True}), 200
    return jsonify({'success': False}), 404

@app.route('/remove/<int:id>', methods=['DELETE'])
def remove_video(id):
    video = Video.query.get(id)
    if video:
        db.session.delete(video)
        db.session.commit()
        return jsonify({'success': True}), 200
    return jsonify({'success': False}), 404

@app.route('/videos/<path:filename>')
def serve_video(filename):
    return send_from_directory(app.config['BASE_DIR'], filename)

@app.route('/open_folder')
def open_folder():
    folder = request.args.get('folder', '')
    full_path = os.path.join(app.config['BASE_DIR'], folder)
    if os.path.isdir(full_path):
        if os.name == 'nt':  # Windows
            os.startfile(full_path)
        elif os.name == 'posix':  # macOS and Linux
            subprocess.call(['xdg-open', full_path])
        return jsonify({'success': True, 'message': f'Opened folder: {full_path}'})
    else:
        return jsonify({'success': False, 'message': 'Folder not found'}), 404

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
