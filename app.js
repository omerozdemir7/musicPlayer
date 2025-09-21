document.addEventListener('DOMContentLoaded', () => {
    // Element tanımlamaları
    const audio = document.getElementById('audio');
    const songTitle = document.getElementById('songTitle');
    const songArtist = document.getElementById('songArtist');
    const albumArt = document.getElementById('albumArt');
    const playlistContainer = document.getElementById('playlistContainer');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const playIcon = document.getElementById('playIcon');
    const pauseIcon = document.getElementById('pauseIcon');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const currentTimeEl = document.getElementById('currentTime');
    const totalDurationEl = document.getElementById('totalDuration');
    const volumeSlider = document.getElementById('volumeSlider');
    const addFilesBtn = document.getElementById('addFilesBtn');
    const addSingleFilesBtn = document.getElementById('addSingleFilesBtn');
    const fileInput = document.getElementById('fileInput');
    const searchInput = document.getElementById('searchInput');
    const libraryContainer = document.getElementById('libraryContainer');
    const toggleLibraryBtn = document.getElementById('toggleLibraryBtn');
    const closeLibraryBtn = document.getElementById('closeLibraryBtn');
    const overlay = document.getElementById('overlay');
    const shuffleBtn = document.getElementById('shuffleBtn');
    const repeatBtn = document.getElementById('repeatBtn');
    const miniPlayer = document.getElementById('miniPlayer');
    const miniAlbum = document.getElementById('miniAlbum');
    const miniTitle = document.getElementById('miniTitle');
    const miniArtist = document.getElementById('miniArtist');
    const miniPlayPause = document.getElementById('miniPlayPause');
    const youtubeForm = document.getElementById('youtubeForm');
    const youtubeInput = document.getElementById('youtubeInput');
    const canvas = document.getElementById('visualizer');
    const ctx = canvas.getContext('2d');

    // Uygulama durumu
    let songLibrary = [];
    let currentSongIndex = 0;
    let isPlaying = false;
    let shuffle = false;
    let repeat = false;
    let audioContext, analyser, sourceNode, dataArray;

    // --- TEMEL OYNATICI FONKSİYONLARI ---

    function applyMarqueeIfNeeded(element) {
        if (element.scrollWidth > element.clientWidth) {
            element.classList.add('marquee');
        } else {
            element.classList.remove('marquee');
        }
    }

    function loadSong(song) {
        if (!song) return;
        songTitle.innerHTML = `<span>${song.title}</span>`;
        songArtist.textContent = song.artist;
        audio.src = song.src;
        albumArt.src = song.albumArtSrc;
        miniTitle.innerHTML = `<span>${song.title}</span>`;
        miniArtist.textContent = song.artist;
        miniAlbum.src = song.albumArtSrc;

        setTimeout(() => {
            applyMarqueeIfNeeded(songTitle);
            applyMarqueeIfNeeded(miniTitle);
        }, 10);
        
        renderLibrary();
    }
    
    function playSong() {
        if (songLibrary.length === 0) return;
        isPlaying = true;
        audio.play().catch(e => console.error("Oynatma hatası:", e));
        updatePlayPauseIcons();
        miniPlayer.classList.add('visible');
        if (!audioContext) setupVisualizer();
        else if (audioContext.state === 'suspended') audioContext.resume();
    }

    function pauseSong() {
        isPlaying = false;
        audio.pause();
        updatePlayPauseIcons();
        if (audioContext) audioContext.suspend();
    }
    
    function prevSong() {
        currentSongIndex = (currentSongIndex - 1 + songLibrary.length) % songLibrary.length;
        loadSong(songLibrary[currentSongIndex]);
        playSong();
    }

    function nextSong() {
        if (repeat && !shuffle) {
            audio.currentTime = 0;
            playSong();
            return;
        }
        if (shuffle) {
            let randomIndex;
            do {
                randomIndex = Math.floor(Math.random() * songLibrary.length);
            } while (songLibrary.length > 1 && randomIndex === currentSongIndex);
            currentSongIndex = randomIndex;
        } else {
            currentSongIndex = (currentSongIndex + 1) % songLibrary.length;
        }
        loadSong(songLibrary[currentSongIndex]);
        playSong();
    }

    function updatePlayPauseIcons() {
        playIcon.style.display = isPlaying ? 'none' : 'block';
        pauseIcon.style.display = isPlaying ? 'block' : 'none';
        miniPlayPause.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
    }

    function updateButtonStates() {
        const hasSongs = songLibrary.length > 0;
        playPauseBtn.disabled = !hasSongs;
        prevBtn.disabled = !hasSongs;
        nextBtn.disabled = !hasSongs;
    }

    // --- KÜTÜPHANE VE DOSYA İŞLEMLERİ ---

    async function createSongFromFile(file) {
        const tags = await new Promise(resolve => {
            new jsmediatags.Reader(file).read({
                onSuccess: (tag) => resolve(tag.tags),
                onError: () => resolve({}),
            });
        });
        let albumArtSrc = 'https://picsum.photos/300/300?grayscale';
        if (tags.picture) {
            const { data, format } = tags.picture;
            let base64String = "";
            for (let i = 0; i < data.length; i++) {
                base64String += String.fromCharCode(data[i]);
            }
            albumArtSrc = `data:${format};base64,${window.btoa(base64String)}`;
        }
        return {
            id: file.name + '-' + file.lastModified,
            title: tags.title || file.name.replace(/\.[^/.]+$/, ""),
            artist: tags.artist || "Bilinmeyen Sanatçı",
            src: URL.createObjectURL(file),
            albumArtSrc: albumArtSrc,
        };
    }

    function renderLibrary(library = songLibrary) {
        playlistContainer.innerHTML = '';
        if (library.length === 0) {
            playlistContainer.innerHTML = '<p class="empty-playlist">Kütüphane boş.</p>';
            return;
        }
        library.forEach((song) => {
            const item = document.createElement('div');
            item.className = 'playlist-item';
            item.dataset.id = song.id;
            if (songLibrary[currentSongIndex] && song.id === songLibrary[currentSongIndex].id) {
                item.classList.add('playing');
            }
            item.innerHTML = `
                <div class="song-info">
                    <div class="title"><span>${song.title}</span></div>
                    <div class="artist">${song.artist}</div>
                </div>
                <button class="delete-song-btn" title="Listeden Kaldır"><i class="fas fa-times"></i></button>`;
            
            item.querySelector('.song-info').addEventListener('click', () => {
                currentSongIndex = songLibrary.findIndex(s => s.id === song.id);
                loadSong(song);
                playSong();
            });
            playlistContainer.appendChild(item);
            applyMarqueeIfNeeded(item.querySelector('.title'));
        });
    }

    // --- OLAY DİNLEYİCİLERİ ---

    playPauseBtn.addEventListener('click', () => isPlaying ? pauseSong() : playSong());
    miniPlayPause.addEventListener('click', () => isPlaying ? pauseSong() : playSong());
    prevBtn.addEventListener('click', prevSong);
    nextBtn.addEventListener('click', nextSong);
    shuffleBtn.addEventListener('click', () => { shuffle = !shuffle; shuffleBtn.classList.toggle('active', shuffle); });
    repeatBtn.addEventListener('click', () => { repeat = !repeat; repeatBtn.classList.toggle('active', repeat); });

    audio.addEventListener('ended', nextSong);
    audio.addEventListener('timeupdate', () => {
        const { duration, currentTime } = audio;
        if (duration) {
            progressBar.style.width = `${(currentTime / duration) * 100}%`;
            currentTimeEl.textContent = formatTime(currentTime);
            totalDurationEl.textContent = formatTime(duration);
        }
    });

    progressContainer.addEventListener('click', (e) => {
        if (audio.duration) audio.currentTime = (e.offsetX / progressContainer.clientWidth) * audio.duration;
    });

    volumeSlider.addEventListener('input', (e) => audio.volume = e.target.value / 100);

    // DÜZELTİLDİ: Tekil dosya ekleme butonu
    addSingleFilesBtn.addEventListener('click', () => fileInput.click());

    // DÜZELTİLDİ: Dosya seçildiğinde ekleme mantığı
    fileInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        
        let firstNewSongIndex = songLibrary.length;
        for (const file of files) {
            if (!songLibrary.some(song => song.id === file.name + '-' + file.lastModified)) {
                const song = await createSongFromFile(file);
                songLibrary.push(song);
            }
        }

        renderLibrary();
        updateButtonStates();
        
        if (!isPlaying && songLibrary.length > 0) {
            currentSongIndex = firstNewSongIndex;
            loadSong(songLibrary[currentSongIndex]);
            playSong();
        }
    });
    
    addFilesBtn.addEventListener('click', async () => {
        if ('showDirectoryPicker' in window) {
            try {
                const dirHandle = await window.showDirectoryPicker();
                const newSongs = [];
                for await (const entry of dirHandle.values()) {
                    if (entry.kind === 'file' && entry.name.match(/\.(mp3|wav|ogg|m4a)$/i)) {
                        const file = await entry.getFile();
                        const song = await createSongFromFile(file);
                        newSongs.push(song);
                    }
                }
                if (newSongs.length > 0) {
                    songLibrary = [...newSongs].sort((a,b) => a.title.localeCompare(b.title));
                    currentSongIndex = 0;
                    loadSong(songLibrary[0]);
                    playSong();
                } else {
                    alert("Seçilen klasörde desteklenen müzik dosyası bulunamadı.");
                }
            } catch (err) { console.log('Klasör seçimi iptal edildi.', err); }
        } else {
            alert('Tarayıcınız klasör seçmeyi desteklemiyor, lütfen "Dosya Ekle" butonunu kullanın.');
        }
    });

    playlistContainer.addEventListener('click', (e) => {
        if (e.target.closest('.delete-song-btn')) {
            const item = e.target.closest('.playlist-item');
            const idToDelete = item.dataset.id;
            const indexToDelete = songLibrary.findIndex(s => s.id === idToDelete);

            if (indexToDelete === -1) return;
            
            songLibrary.splice(indexToDelete, 1);
            
            if (songLibrary.length === 0) {
                // ... oynatıcıyı sıfırla
            } else if (indexToDelete === currentSongIndex) {
                currentSongIndex = Math.max(0, indexToDelete -1);
                loadSong(songLibrary[currentSongIndex]);
                playSong();
            } else if (indexToDelete < currentSongIndex) {
                currentSongIndex--;
            }
            renderLibrary();
            updateButtonStates();
        }
    });

    // DÜZELTİLDİ: YouTube Formu
    youtubeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const videoUrl = youtubeInput.value.trim();
        if (!videoUrl.includes("youtube.com") && !videoUrl.includes("youtu.be")) {
            alert("Lütfen geçerli bir YouTube URL'si girin.");
            return;
        }

        songTitle.textContent = "Yükleniyor...";
        songArtist.textContent = "YouTube'dan ses alınıyor...";

        try {
            // BU ADRES, AŞAĞIDA KURACAĞIMIZ SUNUCUYA AİT
            const response = await fetch(`http://localhost:3000/get-song?url=${encodeURIComponent(videoUrl)}`);
            if (!response.ok) throw new Error(`Sunucu hatası: ${response.statusText}`);
            
            const songData = await response.json();

            const youtubeSong = {
                id: songData.id,
                title: songData.title,
                artist: songData.artist,
                src: songData.streamUrl,
                albumArtSrc: songData.thumbnail
            };

            songLibrary.unshift(youtubeSong);
            currentSongIndex = 0;
            loadSong(youtubeSong);
            playSong();
            youtubeInput.value = '';
            
        } catch (error) {
            console.error("YouTube şarkısı alınamadı:", error);
            alert("Şarkı alınamadı. Sunucunun çalıştığından ve URL'nin doğru olduğundan emin olun.");
            loadSong(songLibrary[currentSongIndex] || {title: 'Hata oluştu', artist: 'Lütfen başka bir şarkı seçin'});
        }
    });

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filtered = songLibrary.filter(s => s.title.toLowerCase().includes(searchTerm) || s.artist.toLowerCase().includes(searchTerm));
        renderLibrary(filtered);
    });
    
    toggleLibraryBtn.addEventListener('click', () => { libraryContainer.classList.add('open'); overlay.classList.add('active'); });
    [closeLibraryBtn, overlay].forEach(el => el.addEventListener('click', () => { libraryContainer.classList.remove('open'); overlay.classList.remove('active'); }));
    
    function formatTime(seconds) { if (isNaN(seconds)) return '0:00'; const m = Math.floor(seconds / 60); const s = Math.floor(seconds % 60); return `${m}:${s < 10 ? '0' : ''}${s}`; }
    function setupVisualizer() { try { audioContext = new (window.AudioContext || window.webkitAudioContext)(); analyser = audioContext.createAnalyser(); sourceNode = audioContext.createMediaElementSource(audio); sourceNode.connect(analyser); analyser.connect(audioContext.destination); analyser.fftSize = 256; dataArray = new Uint8Array(analyser.frequencyBinCount); drawVisualizer(); } catch (err) { console.warn('Visualizer desteklenmiyor:', err); } }
    function drawVisualizer() { if (isPlaying && analyser) { analyser.getByteFrequencyData(dataArray); } ctx.clearRect(0, 0, canvas.width, canvas.height); const barCount = dataArray ? dataArray.length : 0; const barWidth = (canvas.width / barCount) * 1.5; let x = 0; const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim(); for (let i = 0; i < barCount; i++) { const barHeight = (dataArray[i] / 255) * canvas.height; const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight); gradient.addColorStop(0, accentColor); gradient.addColorStop(1, '#ffffff'); ctx.fillStyle = gradient; ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight); x += barWidth + 2; } requestAnimationFrame(drawVisualizer); }
    
    updateButtonStates();
    drawVisualizer();
});