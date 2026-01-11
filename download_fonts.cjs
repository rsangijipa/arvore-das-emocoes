const https = require('https');
const fs = require('fs');
const path = require('path');

const fonts = [
    {
        url: 'https://github.com/google/fonts/raw/main/ofl/playfairdisplay/PlayfairDisplay-Regular.ttf',
        dest: 'public/fonts/PlayfairDisplay-Regular.ttf'
    },
    {
        url: 'https://github.com/google/fonts/raw/main/ofl/lato/Lato-Regular.ttf',
        dest: 'public/fonts/Lato-Regular.ttf'
    }
];

if (!fs.existsSync('public/fonts')) {
    fs.mkdirSync('public/fonts', { recursive: true });
}

fonts.forEach(font => {
    const file = fs.createWriteStream(font.dest);
    console.log(`Starting download: ${font.url}`);

    https.get(font.url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
            https.get(response.headers.location, (res) => {
                res.pipe(file);
                file.on('finish', () => {
                    file.close();
                    console.log(`Downloaded ${font.dest}`);
                });
            }).on('error', (e) => console.error(e));
        } else {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log(`Downloaded ${font.dest}`);
            });
        }
    }).on('error', (err) => {
        console.error(`Error downloading ${font.dest}:`, err.message);
    });
});
