const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');

const app = express();
const PORT = 3000;

app.use(cors()); // Tarayıcının sunucuya erişmesine izin ver

// Bu fonksiyon hem ses akışının URL'sini hem de video bilgilerini alır
app.get('/get-song', async (req, res) => {
    const videoUrl = req.query.url;

    if (!videoUrl || !ytdl.validateURL(videoUrl)) {
        return res.status(400).json({ error: 'Geçerli bir YouTube URL\'si gerekli.' });
    }

    try {
        const info = await ytdl.getInfo(videoUrl);
        const audioFormat = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' });

        if (!audioFormat) {
            return res.status(404).json({ error: 'Bu video için uygun bir ses formatı bulunamadı.' });
        }
        
        // Tarayıcıya video bilgilerini ve ses akışının URL'sini gönder
        res.json({
            id: `yt-${info.videoDetails.videoId}`,
            title: info.videoDetails.title,
            artist: info.videoDetails.ownerChannelName,
            thumbnail: info.videoDetails.thumbnails[0].url,
            streamUrl: audioFormat.url 
        });

    } catch (error) {
        console.error('Sunucu hatası:', error.message);
        res.status(500).json({ error: 'Şarkı bilgileri alınırken sunucuda bir hata oluştu.' });
    }
});

app.listen(PORT, () => {
    console.log(`Müzik çalar sunucusu http://localhost:${PORT} adresinde çalışıyor.`);
    console.log('Artık index.html dosyasını tarayıcıda açabilirsiniz.');
});