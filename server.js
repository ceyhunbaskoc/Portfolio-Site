const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const app = express();
const PORT = 3000;

// Multer ile dosya yükleme
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(__dirname));

const projectsFile = path.join(__dirname, 'projects.json');

app.post('/add-project', upload.single('image'), (req, res) => {
    const { title, shortDesc, longDesc, htmlFile, github, itch } = req.body;
    const imageBuffer = req.file ? req.file.buffer : null;
    const imageName = req.file ? `${Date.now()}-${req.file.originalname}` : null;

    // Markdown → HTML
    const longDescHTML = marked.parse(longDesc || '');

    // Resim kaydet
    if (imageBuffer) {
        const imagePath = path.join(__dirname, 'img/projects', imageName);
        fs.writeFileSync(imagePath, imageBuffer);
    }

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
        image: `img/projects/${imageName}`,
        htmlFile: `html/${htmlFile}`,
        github,
        itch
    });
    fs.writeFileSync(projectsFile, JSON.stringify(projects, null, 2));

    res.json({ success: true });
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}/html/index.html`));
