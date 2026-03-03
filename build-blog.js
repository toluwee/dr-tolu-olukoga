const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const matter = require('gray-matter');

const POSTS_DIR = './posts';
const BLOG_DIR = './blog';
const OLD_SITE_DIR = './old-site';

marked.setOptions({
  breaks: true,
  gfm: true,
});

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function estimateReadTime(content) {
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return `${minutes} min read`;
}

function getPostTemplate(post, content) {
  const tags = post.tags.map(tag =>
    `<span class="tag" style="background-color: #3b82f6; color: white;">${tag}</span>`
  ).join('\n        ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${post.title} | Tolu Olukoga</title>
  <meta name="description" content="${post.summary}"/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="../style.css"/>
  <style>
    pre {
      background-color: #1e293b;
      color: #e2e8f0;
      padding: 1rem;
      border-radius: 4px;
      overflow-x: auto;
      font-family: 'Courier New', monospace;
      font-size: 0.9rem;
      line-height: 1.5;
    }
    code {
      background-color: #1e293b;
      color: #e2e8f0;
      padding: 0.2rem 0.4rem;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
    }
    pre code {
      background: none;
      padding: 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5rem 0;
    }
    th, td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }
    th {
      background-color: #f1f5f9;
      font-weight: 600;
      color: var(--navy);
    }
    blockquote {
      border-left: 4px solid var(--accent);
      padding-left: 1rem;
      margin: 1.5rem 0;
      color: var(--text-light);
      font-style: italic;
    }
    article img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin: 1.5rem 0;
    }
  </style>
</head>
<body>
  <nav>
    <div class="container">
      <a href="../index.html" class="nav-logo">Tolu Olukoga</a>
      <button class="nav-toggle" aria-label="Toggle navigation">☰</button>
      <ul class="nav-menu">
        <li><a href="../index.html">Home</a></li>
        <li><a href="../projects.html">Projects</a></li>
        <li><a href="../blog.html" class="active">Blog</a></li>
        <li><a href="../about.html">About</a></li>
        <li><a href="../contact.html">Contact</a></li>
      </ul>
    </div>
  </nav>

  <header style="padding: 2rem 0;">
    <div class="container" style="text-align: left;">
      <p style="margin: 0; color: #cbd5e1;"><a href="../blog.html" style="color: #cbd5e1;">← Back to Blog</a></p>
      <h1 style="margin: 1rem 0;">${post.title}</h1>
      <div style="color: #cbd5e1; font-size: 0.95rem;">
        <span>${formatDate(post.date)}</span> •
        <span>${estimateReadTime(content)}</span>
      </div>
      <div style="margin-top: 1rem;">
        ${tags}
      </div>
    </div>
  </header>

  <main class="container">
    <article>
      <div class="card" style="max-width: 800px; margin: 0 auto;">
        ${content}
      </div>
    </article>

    <section style="margin-top: 3rem;">
      <div class="card" style="max-width: 800px; margin: 0 auto; background-color: var(--border);">
        <h3 style="margin-top: 0;">About the Author</h3>
        <p>Tolu Olukoga is a Senior AI Systems Engineer specializing in agentic AI architecture, multi-agent orchestration, and production MLOps. He builds production-scale AI systems in regulated environments.</p>
        <p><a href="../about.html" class="btn btn-link">Learn more about Tolu →</a></p>
      </div>
    </section>

    <section style="margin-top: 2rem; text-align: center;">
      <a href="../blog.html" class="btn btn-secondary">← Back to All Posts</a>
      <a href="../contact.html" class="btn btn-primary" style="margin-left: 1rem;">Get In Touch</a>
    </section>
  </main>

  <footer>
    <p>© 2026 Tolu Olukoga. All rights reserved.</p>
  </footer>

  <script src="../script.js"></script>
</body>
</html>`;
}

function generateBlogIndex(posts) {
  const postCards = posts.map(post => {
    const tags = post.tags.map(tag =>
      `<span class="tag success">${tag}</span>`
    ).join('\n          ');

    return `      <div class="card blog-card">
        <div class="card-meta">${formatDate(post.date)} • ${estimateReadTime(post.content)}</div>
        <h3 class="card-title">${post.title}</h3>
        <div class="card-tags">
          ${tags}
        </div>
        <p class="card-excerpt">${post.summary}</p>
        <a href="blog/${post.slug}.html" class="btn btn-link">Read More →</a>
      </div>`;
  }).join('\n\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Blog | Tolu Olukoga</title>
  <meta name="description" content="Technical blog posts on AI/ML engineering, agentic systems, and production ML infrastructure."/>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="style.css"/>
</head>
<body>
  <nav>
    <div class="container">
      <a href="index.html" class="nav-logo">Tolu Olukoga</a>
      <button class="nav-toggle" aria-label="Toggle navigation">☰</button>
      <ul class="nav-menu">
        <li><a href="index.html">Home</a></li>
        <li><a href="projects.html">Projects</a></li>
        <li><a href="blog.html" class="active">Blog</a></li>
        <li><a href="about.html">About</a></li>
        <li><a href="contact.html">Contact</a></li>
      </ul>
    </div>
  </nav>

  <header style="padding: 3rem 0;">
    <div class="container" style="text-align: center;">
      <h1 style="margin: 0; font-size: 2.5rem; color: white;">Blog</h1>
      <p class="subtitle" style="color: #cbd5e1;">Technical insights on AI/ML engineering and production systems</p>
    </div>
  </header>

  <main class="container">
    <section>
      <div class="grid-2">
${postCards}
      </div>
    </section>
  </main>

  <footer>
    <p>© 2026 Tolu Olukoga. All rights reserved.</p>
  </footer>

  <script src="script.js"></script>
</body>
</html>`;
}

function buildBlog() {
  ensureDir(BLOG_DIR);

  const postFiles = fs.readdirSync(POSTS_DIR)
    .filter(file => file.endsWith('.md'))
    .sort()
    .reverse();

  const posts = [];

  postFiles.forEach(file => {
    const filePath = path.join(POSTS_DIR, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(fileContent);

    const html = marked(content);
    const slug = path.basename(file, '.md');

    const post = {
      title: data.title,
      date: data.date,
      tags: data.tags || [],
      summary: data.summary || '',
      slug: slug,
      content: content,
    };

    const postHtml = getPostTemplate(post, html);
    fs.writeFileSync(path.join(BLOG_DIR, `${slug}.html`), postHtml);

    posts.push(post);
    console.log(`✓ Built: ${slug}.html`);
  });

  const indexHtml = generateBlogIndex(posts);
  fs.writeFileSync('./blog.html', indexHtml);
  console.log(`✓ Built: blog.html (index with ${posts.length} posts)`);
}

buildBlog();
console.log('\n✨ Blog build complete!');
