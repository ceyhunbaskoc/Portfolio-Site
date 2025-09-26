import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES modules'te __dirname yoktur, bu yüzden oluşturmamız gerekir
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Multer ile dosya yükleme
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static dosyalar için middleware - Vercel için düzeltildi
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/img', express.static(path.join(__dirname, 'img')));
app.use('/video', express.static(path.join(__dirname, 'video')));
app.use(express.static(__dirname));

const projectsFile = path.join(__dirname, 'projects.json');

// Ana sayfa route'u - html/index.html'i serve et
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'html', 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('index.html not found');
    }
});

// HTML dosyaları için genel route
app.get('/*.html', (req, res) => {
    const fileName = req.params[0] + '.html';
    const filePath = path.join(__dirname, 'html', fileName);
    
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send(`${fileName} not found`);
    }
});

// Direkt HTML klasöründeki dosyalara erişim
app.get('/html/:filename', (req, res) => {
    const fileName = req.params.filename;
    const filePath = path.join(__dirname, 'html', fileName);
    
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send(`${fileName} not found in html directory`);
    }
});

// Projects.html için özel route (eğer root'ta çağrılırsa)
app.get('/projects.html', (req, res) => {
    const projectsPath = path.join(__dirname, 'html', 'projects.html');
    if (fs.existsSync(projectsPath)) {
        res.sendFile(projectsPath);
    } else {
        res.status(404).send('projects.html not found');
    }
});

app.post('/add-project', upload.single('image'), (req, res) => {
    const { title, shortDesc, longDesc, htmlFile, github, itch } = req.body;
    const imageBuffer = req.file ? req.file.buffer : null;
    const imageName = req.file ? `${Date.now()}-${req.file.originalname}` : null;

    // Markdown → HTML
    const longDescHTML = marked.parse(longDesc || '');

    // Resim kaydet
    if (imageBuffer) {
        const projectsDir = path.join(__dirname, 'img/projects');
        if (!fs.existsSync(projectsDir)) {
            fs.mkdirSync(projectsDir, { recursive: true });
        }
        const imagePath = path.join(projectsDir, imageName);
        fs.writeFileSync(imagePath, imageBuffer);
    }

    const templatePath = path.join(__dirname, 'html/project-template.html');
    if (!fs.existsSync(templatePath)) {
        return res.status(500).json({ error: 'project-template.html not found' });
    }

    let template = fs.readFileSync(templatePath, 'utf-8');

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
        fs.mkdirSync(htmlDir, { recursive: true });
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
        image: `img/projects/${imageName}`,
        htmlFile: `html/${htmlFile}`,
        github,
        itch
    });
    fs.writeFileSync(projectsFile, JSON.stringify(projects, null, 2));

    res.json({ success: true });
});

// 404 handler
app.use((req, res) => {
    res.status(404).send('Page not found');
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));