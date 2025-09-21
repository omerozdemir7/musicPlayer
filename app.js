document.addEventListener('DOMContentLoaded', () => {
    // Elementler
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
    const playerContainer = document.getElementById('playerContainer');
    
    // Visualizer
    const canvas = document.getElementById('visualizer');
    const ctx = canvas.getContext('2d');

    // App state
    let songLibrary = JSON.parse(localStorage.getItem('songLibrary')) || [];
    let currentSongIndex = 0;
    let isPlaying = false;
    let shuffle = false;
    let repeat = false;
    let audioContext, analyser, sourceNode, dataArray;

    // --- TEMEL FONKSİYONLAR ---

    // Şarkıyı yükler ve arayüzü günceller
    function loadSong(song) {
        if (!song) return;
        songTitle.textContent = song.title;
        songArtist.textContent = song.artist;
        audio.src = song.src;
        albumArt.src = song.albumArtSrc;
        miniAlbum.src = song.albumArtSrc;
        miniTitle.textContent = song.title;
        miniArtist.textContent = song.artist;
        renderLibrary(); // Aktif şarkıyı vurgulamak için
    }

    // Kütüphaneyi arayüzde listeler
    function renderLibrary(library = songLibrary) {
        playlistContainer.innerHTML = '';
        if (library.length === 0) {
            playlistContainer.innerHTML = '<p class="empty-playlist">Henüz müzik eklenmedi.</p>';
            return;
        }
        library.forEach((song, idx) => {
            const item = document.createElement('div');
            item.className = 'playlist-item';
            if (idx === currentSongIndex) {
                item.classList.add('playing');
            }
            item.innerHTML = `<div class="title">${song.title}</div><div class="artist">${song.artist}</div>`;
            item.addEventListener('click', () => {
                currentSongIndex = songLibrary.indexOf(song); // Filtrelenmiş listede doğru indeksi bul
                loadSong(song);
                playSong();
            });
            playlistContainer.appendChild(item);
        });
    }

    // Oynat/Duraklat durumuna göre ikonları günceller
    function updatePlayPauseIcons() {
        if (isPlaying) {
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
            miniPlayPause.innerHTML = '<i class="fas fa-pause"></i>';
            playerContainer.classList.add('playing');
        } else {
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
            miniPlayPause.innerHTML = '<i class="fas fa-play"></i>';
            playerContainer.classList.remove('playing');
        }
    }

    function playSong() {
        if (songLibrary.length === 0) return;
        isPlaying = true;
        audio.play();
        updatePlayPauseIcons();
        miniPlayer.classList.add('visible');
        if (!audioContext) setupVisualizer();
        else audioContext.resume();
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
        if (repeat) {
            audio.currentTime = 0;
            playSong();
            return;
        }
        if (shuffle) {
            currentSongIndex = Math.floor(Math.random() * songLibrary.length);
        } else {
            currentSongIndex = (currentSongIndex + 1) % songLibrary.length;
        }
        loadSong(songLibrary[currentSongIndex]);
        playSong();
    }

    // Butonların aktif/pasif durumunu ayarlar
    function updateButtonStates() {
        const hasSongs = songLibrary.length > 0;
        playPauseBtn.disabled = !hasSongs;
        prevBtn.disabled = !hasSongs;
        nextBtn.disabled = !hasSongs;
    }

    // --- DOSYA İŞLEMLERİ ---

    // Dosyalardan metadata okur ve kütüphaneye ekler
    async function handleFiles(files) {
        for (const file of files) {
            if (!file.type.startsWith('audio')) continue;

            const tags = await new Promise((resolve, reject) => {
                new jsmediatags.Reader(file).read({
                    onSuccess: (tag) => resolve(tag.tags),
                    onError: (error) => resolve({}), // Hata durumunda boş obje dön
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

            const song = {
                id: Date.now() + Math.random(),
                title: tags.title || file.name.replace(/\.[^/.]+$/, ""),
                artist: tags.artist || "Bilinmeyen Sanatçı",
                src: URL.createObjectURL(file),
                albumArtSrc: albumArtSrc,
            };
            songLibrary.push(song);
        }

        if (files.length > 0) {
            renderLibrary();
            updateButtonStates();
            // Eğer hiç şarkı çalmadıysa ilk ekleneni yükle
            if (!audio.src && songLibrary.length > 0) {
                currentSongIndex = songLibrary.length - files.length;
                loadSong(songLibrary[currentSongIndex]);
            }
            localStorage.setItem('songLibrary', JSON.stringify(songLibrary));
        }
    }


    // --- GÖRSELLEŞTİRİCİ ---

    function setupVisualizer() {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            sourceNode = audioContext.createMediaElementSource(audio);
            sourceNode.connect(analyser);
            analyser.connect(audioContext.destination);
            analyser.fftSize = 256;
            const bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);
            drawVisualizer();
        } catch (err) {
            console.warn('Visualizer desteklenmiyor:', err);
            visualizer.style.display = 'none';
        }
    }

    function drawVisualizer() {
        if (!analyser || !isPlaying) {
            requestAnimationFrame(drawVisualizer);
            return;
        };
        requestAnimationFrame(drawVisualizer);
        analyser.getByteFrequencyData(dataArray);

        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const barCount = dataArray.length;
        const barWidth = (canvas.width / barCount) * 1.5;
        let x = 0;

        const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim();

        for (let i = 0; i < barCount; i++) {
            const barHeight = (dataArray[i] / 255) * canvas.height;
            
            // Modern gradient
            const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
            gradient.addColorStop(0, accentColor);
            gradient.addColorStop(1, '#ffffff');
            ctx.fillStyle = gradient;
            
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 2; // Çubuklar arası boşluk
        }
    }


    // --- OLAY DİNLEYİCİLERİ ---

    playPauseBtn.addEventListener('click', () => isPlaying ? pauseSong() : playSong());
    miniPlayPause.addEventListener('click', () => isPlaying ? pauseSong() : playSong());
    prevBtn.addEventListener('click', prevSong);
    nextBtn.addEventListener('click', nextSong);
    shuffleBtn.addEventListener('click', () => {
        shuffle = !shuffle;
        shuffleBtn.classList.toggle('active', shuffle);
    });
    repeatBtn.addEventListener('click', () => {
        repeat = !repeat;
        repeatBtn.classList.toggle('active', repeat);
    });
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
        const width = progressContainer.clientWidth;
        const clickX = e.offsetX;
        if (audio.duration) audio.currentTime = (clickX / width) * audio.duration;
    });
    volumeSlider.addEventListener('input', (e) => audio.volume = e.target.value / 100);
    addFilesBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
    document.body.addEventListener('dragover', (e) => e.preventDefault());
    document.body.addEventListener('drop', (e) => {
        e.preventDefault();
        handleFiles(e.dataTransfer.files);
    });
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filtered = songLibrary.filter(s => 
            s.title.toLowerCase().includes(searchTerm) || 
            s.artist.toLowerCase().includes(searchTerm)
        );
        renderLibrary(filtered);
    });
    toggleLibraryBtn.addEventListener('click', () => {
        libraryContainer.classList.add('open');
        overlay.classList.add('active');
    });
    [closeLibraryBtn, overlay].forEach(el => el.addEventListener('click', () => {
        libraryContainer.classList.remove('open');
        overlay.classList.remove('active');
    }));

    // --- YARDIMCI FONKSİYONLAR ---
    function formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }

    // --- BAŞLANGIÇ ---
    function init() {
        if (songLibrary.length > 0) {
            loadSong(songLibrary[currentSongIndex]);
        }
        renderLibrary();
        updateButtonStates();
    }

    init();
});