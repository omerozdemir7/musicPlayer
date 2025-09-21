document.addEventListener('DOMContentLoaded', () => {
    // Mevcut element tanımlamalarınız
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
    const canvas = document.getElementById('visualizer');
    const ctx = canvas.getContext('2d');
    // YENİ BUTON TANIMLAMASI
    const addSingleFilesBtn = document.getElementById('addSingleFilesBtn');

    // App state
    let songLibrary = [];
    let currentSongIndex = 0;
    let isPlaying = false;
    let shuffle = false;
    let repeat = false;
    let audioContext, analyser, sourceNode, dataArray;

    // --- IndexedDB & File System Access API ---
    const dbName = 'MelodiKovaniDB';
    const storeName = 'fileStore';
    let db;

    function initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, 1);
            request.onupgradeneeded = event => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName);
                }
            };
            request.onsuccess = event => {
                db = event.target.result;
                resolve(db);
            };
            request.onerror = event => reject(event.target.error);
        });
    }

    function dbGet(key) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    function dbSet(key, value) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(value, key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Klasördeki dosyaları tara ve kütüphaneye ekle
    async function processDirectoryHandle(directoryHandle) {
        songLibrary = []; // Kütüphaneyi temizle ve yeniden oluştur
        const supportedFormats = ['.mp3', '.m4a', '.wav', '.ogg', '.flac'];
        
        for await (const entry of directoryHandle.values()) {
            if (entry.kind === 'file' && supportedFormats.some(format => entry.name.endsWith(format))) {
                const file = await entry.getFile();
                const song = await createSongFromFile(file);
                songLibrary.push(song);
            }
        }
        
        songLibrary.sort((a, b) => a.title.localeCompare(b.title)); // Alfabetik sırala

        if (songLibrary.length > 0) {
            currentSongIndex = 0;
            loadSong(songLibrary[0]);
            renderLibrary();
            updateButtonStates();
        } else {
            alert("Seçilen klasörde desteklenen formatta müzik dosyası bulunamadı.");
        }
    }

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
            let base64String = data.reduce((acc, byte) => acc + String.fromCharCode(byte), "");
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

    // --- YENİ FONKSİYON: Metin taşmasını kontrol edip animasyon sınıfı ekler ---
    function applyMarqueeIfNeeded(element) {
        // Elementin içeriğinin gerçek genişliği, görünen genişliğinden büyük mü?
        if (element.scrollWidth > element.clientWidth) {
            element.classList.add('marquee');
        } else {
            element.classList.remove('marquee');
        }
    }

    // --- TEMEL PLAYER FONKSİYONLARI ---
    function loadSong(song) {
        if (!song) return;
        
        // Kayan yazı için başlıkları span içine al
        songTitle.innerHTML = `<span>${song.title}</span>`;
        songArtist.textContent = song.artist;
        audio.src = song.src;
        albumArt.src = song.albumArtSrc;
        miniAlbum.src = song.albumArtSrc;
        miniTitle.innerHTML = `<span>${song.title}</span>`;
        miniArtist.textContent = song.artist;
        
        // DOM güncellendikten sonra taşma kontrolü yap
        setTimeout(() => {
            applyMarqueeIfNeeded(songTitle);
            applyMarqueeIfNeeded(miniTitle);
        }, 10);

        renderLibrary();
    }

    function renderLibrary(library = songLibrary) {
        playlistContainer.innerHTML = '';
        if (library.length === 0) {
            playlistContainer.innerHTML = '<p class="empty-playlist">Henüz müzik eklenmedi.</p>';
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
                <button class="delete-song-btn" title="Listeden Kaldır"><i class="fas fa-times"></i></button>
            `;
            
            // Oynatma olayını sadece şarkı bilgisine bağla
            item.querySelector('.song-info').addEventListener('click', () => {
                currentSongIndex = songLibrary.findIndex(s => s.id === song.id);
                loadSong(song);
                playSong();
            });

            playlistContainer.appendChild(item);

            // Her bir liste elemanı eklendikten sonra taşma kontrolü yap
            const titleElement = item.querySelector('.title');
            applyMarqueeIfNeeded(titleElement);
        });
    }

    function updatePlayPauseIcons() {
        if (isPlaying) {
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
            miniPlayPause.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
            miniPlayPause.innerHTML = '<i class="fas fa-play"></i>';
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
        if (repeat && isPlaying && !shuffle) {
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

    function updateButtonStates() {
        const hasSongs = songLibrary.length > 0;
        playPauseBtn.disabled = !hasSongs;
        prevBtn.disabled = !hasSongs;
        nextBtn.disabled = !hasSongs;
    }
    
    // GÖRSELLEŞTİRİCİ (Değişiklik yok)
    function setupVisualizer() {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            sourceNode = audioContext.createMediaElementSource(audio);
            sourceNode.connect(analyser);
            analyser.connect(audioContext.destination);
            analyser.fftSize = 256;
            dataArray = new Uint8Array(analyser.frequencyBinCount);
            drawVisualizer();
        } catch (err) { console.warn('Visualizer desteklenmiyor:', err); }
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
            const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
            gradient.addColorStop(0, accentColor);
            gradient.addColorStop(1, '#ffffff');
            ctx.fillStyle = gradient;
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 2;
        }
    }

    function formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
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
    
    // Klasör seçme butonu
    addFilesBtn.addEventListener('click', async () => {
        if ('showDirectoryPicker' in window) {
            try {
                const directoryHandle = await window.showDirectoryPicker();
                await dbSet('musicDirectoryHandle', directoryHandle);
                await processDirectoryHandle(directoryHandle);
            } catch (err) {
                console.log('Kullanıcı klasör seçmeyi iptal etti.', err);
            }
        } else {
            alert('Tarayıcınız klasör seçme özelliğini desteklemiyor. Lütfen "Dosya Ekle" butonunu kullanın.');
        }
    });

    // YENİ: Tekil dosya ekleme butonu
    addSingleFilesBtn.addEventListener('click', () => {
        fileInput.click();
    });

    // DEĞİŞTİ: Dosya seçildiğinde mevcut listeye ekleme yapar
    fileInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        let newSongsAdded = false;
        for (const file of files) {
            const songExists = songLibrary.some(song => song.id === file.name + '-' + file.lastModified);
            if (!songExists) {
                const song = await createSongFromFile(file);
                songLibrary.push(song);
                newSongsAdded = true;
            }
        }
        if (newSongsAdded) {
            if (!isPlaying && songLibrary.length === files.length) {
                currentSongIndex = 0;
                loadSong(songLibrary[0]);
            }
            renderLibrary();
            updateButtonStates();
        }
    });
    
    // YENİ: Listeden şarkı silme işlevi
    playlistContainer.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-song-btn');
        if (deleteBtn) {
            const playlistItem = deleteBtn.closest('.playlist-item');
            const songIdToDelete = playlistItem.dataset.id;
            
            if (songIdToDelete) {
                const deletingIndex = songLibrary.findIndex(song => song.id === songIdToDelete);
                const isDeletingCurrent = currentSongIndex === deletingIndex;

                songLibrary.splice(deletingIndex, 1);
                
                if (isDeletingCurrent) {
                    if (songLibrary.length === 0) {
                        audio.src = '';
                        pauseSong();
                        loadSong({ title: 'Müzik Bekleniyor', artist: 'Lütfen bir klasör seçin', src: '', albumArtSrc: 'https://picsum.photos/300/300?grayscale' });
                        miniPlayer.classList.remove('visible');
                    } else {
                        currentSongIndex = Math.max(0, Math.min(deletingIndex, songLibrary.length - 1));
                        loadSong(songLibrary[currentSongIndex]);
                        playSong();
                    }
                } else {
                     // Silinen şarkı çalan şarkıdan önceyse, indeksi düzelt
                    if(deletingIndex < currentSongIndex){
                        currentSongIndex--;
                    }
                    renderLibrary(); // Sadece listeyi güncelle
                }
                updateButtonStates();
            }
        }
    });

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filtered = songLibrary.filter(s => 
            s.title.toLowerCase().includes(searchTerm) || 
            s.artist.toLowerCase().includes(searchTerm)
        );
        renderLibrary(filtered);
    });
    toggleLibraryBtn.addEventListener('click', () => { libraryContainer.classList.add('open'); overlay.classList.add('active'); });
    [closeLibraryBtn, overlay].forEach(el => el.addEventListener('click', () => { libraryContainer.classList.remove('open'); overlay.classList.remove('active'); }));

    // --- BAŞLANGIÇ ---
    async function init() {
        await initDB();
        const directoryHandle = await dbGet('musicDirectoryHandle');
        if (directoryHandle) {
            if (await directoryHandle.queryPermission({ mode: 'read' }) === 'granted' || await directoryHandle.requestPermission({ mode: 'read' }) === 'granted') {
                await processDirectoryHandle(directoryHandle);
            } else {
                console.error('Klasöre erişim izni verilmedi.');
            }
        }
        updateButtonStates();
    }

    init();
});