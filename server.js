import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import sanitizeHtml from 'sanitize-html'; // 👈 yeni eklendi

// ES modules'te __dirname yoktur
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Multer ile dosya yükleme
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static klasörler
app.use(express.static(path.join(__dirname))); // tüm dosyaları root'tan serve et
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/img', express.static(path.join(__dirname, 'img')));
app.use('/video', express.static(path.join(__dirname, 'video')));
app.use('/html', express.static(path.join(__dirname, 'html')));

const projectsFile = path.join(__dirname, 'projects.json');

// Ana sayfa
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'index.html'));
});

// Projects.html
app.get('/projects.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'projects.html'));
});

// Dinamik HTML serve (nightclaw veya diğer projeler)
app.get('/:htmlFile', (req, res) => {
    const filePath = path.join(__dirname, req.params.htmlFile);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('Not Found');
    }
});

// Proje ekleme
app.post('/add-project', upload.single('image'), (req, res) => {
    const { title, shortDesc, longDesc, htmlFile, github, itch, descType } = req.body; // 👈 descType eklendi
    const imageBuffer = req.file ? req.file.buffer : null;
    const imageName = req.file ? `${Date.now()}-${req.file.originalname}` : null;

    // Açıklama türüne göre dönüştürme
    let longDescHTML = '';
    if (descType === 'markdown') {
        longDescHTML = marked.parse(longDesc || '');
    } else {
        // Normal HTML olarak al — sanitize ederek güvenli hale getir
        longDescHTML = sanitizeHtml(longDesc || '', {
            allowedTags: [
                'b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li',
                'a', 'h1', 'h2', 'h3', 'img', 'blockquote', 'pre', 'code'
            ],
            allowedAttributes: {
                a: ['href', 'target'],
                img: ['src', 'alt']
            }
        });
    }

    // Resim kaydet
    if (imageBuffer) {
        const imagePath = path.join(__dirname, 'img/projects', imageName);
        fs.writeFileSync(imagePath, imageBuffer);
    }

    // Project template
    let template = fs.readFileSync(path.join(__dirname, 'html/project-template.html'), 'utf-8');

    const githubButton = github
        ? `<a href="${github}" target="_blank" class="btn btn-dark me-2">GitHub</a>`
        : '';

    const itchButton = itch
        ? `<a href="${itch}" target="_blank" class="btn btn-danger">Itch.io</a>`
        : '';

    template = template
        .replace(/{{TITLE}}/g, title)
        .replace(/{{SHORT_DESC}}/g, shortDesc)
        .replace(/{{LONG_DESC}}/g, longDescHTML)
        .replace(/{{IMAGE_PATH}}/g, imageName ? `img/projects/${imageName}` : '')
        .replace(/{{GITHUB_BUTTON}}/g, githubButton)
        .replace(/{{ITCH_BUTTON}}/g, itchButton);

    const htmlDir = path.join(__dirname, 'html');
    if (!fs.existsSync(htmlDir)) {
        fs.mkdirSync(htmlDir);
    }
    fs.writeFileSync(path.join(htmlDir, htmlFile), template, 'utf-8');

    // projects.json güncelle
    let projects = [];
    if (fs.existsSync(projectsFile)) {
        projects = JSON.parse(fs.readFileSync(projectsFile, 'utf-8'));
    }
    projects.push({
        title,
        shortDesc,
        longDesc,
        image: `/img/projects/${imageName}`,
        htmlFile: `/${htmlFile}`,
        github,
        itch,
        descType // kayıtta da saklayabiliriz
    });
    fs.writeFileSync(projectsFile, JSON.stringify(projects, null, 2));

    res.json({ success: true });
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}/html/index.html`));
