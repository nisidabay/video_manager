const folderList = document.getElementById('folder-list');
const videoList = document.getElementById('video-list');
const searchInput = document.getElementById('search-input');
const videoPlayer = document.getElementById('video-player');
const videoOverlay = document.getElementById('video-overlay');
const closeVideoBtn = document.getElementById('close-video');
const resizer = document.getElementById('resizer');
const sidebar = document.querySelector('.sidebar');
const contextMenu = document.getElementById('context-menu');
const openFolderMenuItem = document.getElementById('open-folder');

let isResizing = false;
let currentFolder = '';

function loadFolders() {
    axios.get('/folders')
        .then(response => {
            folderList.innerHTML = '';
            response.data.forEach(folder => {
                const li = document.createElement('li');
                li.textContent = folder;
                li.onclick = () => {
                    loadVideos(folder);
                    highlightFolder(li);
                };
                li.oncontextmenu = (e) => showContextMenu(e, folder);
                folderList.appendChild(li);
            });
        });
}

function highlightFolder(element) {
    const allFolders = folderList.querySelectorAll('li');
    allFolders.forEach(f => f.classList.remove('active'));
    element.classList.add('active');
}

function showContextMenu(e, folder) {
    e.preventDefault();
    contextMenu.style.display = 'block';
    contextMenu.style.left = e.pageX + 'px';
    contextMenu.style.top = e.pageY + 'px';
    currentFolder = folder;
}

function hideContextMenu() {
    contextMenu.style.display = 'none';
}

function openInFileManager(folder) {
    axios.get(`/open_folder?folder=${folder}`)
        .then(response => {
            console.log(response.data);
        })
        .catch(error => {
            console.error('Error opening folder:', error);
        });
}

function loadVideos(folder) {
    axios.get(`/videos?folder=${folder}`)
        .then(response => {
            displayVideos(response.data);
        });
}

function displayVideos(videos) {
    videoList.innerHTML = '';
    videos.forEach(video => {
        const div = document.createElement('div');
        div.className = 'video-item';
        div.innerHTML = `
            <div class="video-info">
                <div class="video-title">${video.title}</div>
                <div class="video-tags">${video.tags || 'No tags'}</div>
            </div>
            <div>
                <button onclick="playVideo('/videos/${video.path}')" class="btn">Play</button>
                <button onclick="editVideo(${video.id}, '${video.title}', '${video.tags}')" class="btn">Edit</button>
                <button onclick="removeVideo(${video.id})" class="btn">Remove</button>
            </div>
        `;
        videoList.appendChild(div);
    });
}

function playVideo(path) {
    videoPlayer.src = path;
    videoOverlay.classList.add('active');
    videoPlayer.play();
}

function closeVideo() {
    videoPlayer.pause();
    videoOverlay.classList.remove('active');
}

function editVideo(id, title, tags) {
    const newTitle = prompt('Enter new title:', title);
    const newTags = prompt('Enter new tags:', tags);
    if (newTitle && newTags) {
        const formData = new FormData();
        formData.append('title', newTitle);
        formData.append('tags', newTags);
        axios.put(`/edit/${id}`, formData)
            .then(() => {
                const currentFolder = folderList.querySelector('li.active');
                if (currentFolder) {
                loadVideos(currentFolder.textContent);
                } else {
                    searchVideos();
                }
            });
    }
}

function removeVideo(id) {
    if (confirm('Are you sure you want to remove this video?')) {
        axios.delete(`/remove/${id}`)
            .then(() => {
                const currentFolder = folderList.querySelector('li.active');
                if (currentFolder) {
                    loadVideos(currentFolder.textContent);
                } else {
                    searchVideos();
                }
            });
    }
}

function searchVideos() {
    const query = searchInput.value;
    axios.get(`/search?q=${query}`)
        .then(response => {
            displayVideos(response.data);
        });
}

function initResizer() {
    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', stopResize);
    });
}

function resize(e) {
    if (isResizing) {
        const newWidth = e.clientX - sidebar.getBoundingClientRect().left;
        if (newWidth > 100 && newWidth < 500) {
            sidebar.style.width = newWidth + 'px';
        }
    }
}

function stopResize() {
    isResizing = false;
    document.removeEventListener('mousemove', resize);
}

searchInput.addEventListener('input', searchVideos);
closeVideoBtn.addEventListener('click', closeVideo);
document.addEventListener('click', hideContextMenu);
openFolderMenuItem.addEventListener('click', () => openInFileManager(currentFolder));

videoOverlay.addEventListener('click', (e) => {
    if (e.target === videoOverlay) {
        closeVideo();
    }
});

loadFolders();
initResizer();
