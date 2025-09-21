const fileInput = document.getElementById('file-input');
const songDatabase = []; // Müziklerin saklanacağı dizi

fileInput.addEventListener('change', (event) => {
  const files = event.target.files;

  for (const file of files) {
    const song = {
      id: Date.now() + Math.random(), // Benzersiz bir kimlik
      name: file.name,
      artist: "Bilinmeyen Sanatçı", // Bu bilgi meta veriden okunabilir
      url: URL.createObjectURL(file) // Dosyanın geçici URL'si
    };
    songDatabase.push(song);
  }

  // Burada songDatabase'i IndexedDB'ye kaydedip arayüzü güncelleriz.
  updateLibraryUI();
});


const searchInput = document.getElementById('search-box');

searchInput.addEventListener('keyup', (event) => {
  const searchTerm = event.target.value.toLowerCase();

  const filteredSongs = songDatabase.filter(song => {
    return song.name.toLowerCase().includes(searchTerm) ||
           song.artist.toLowerCase().includes(searchTerm);
  });

  // Arayüzü filtrelenmiş şarkılarla güncelle.
  displaySongs(filteredSongs);
});