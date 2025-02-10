import express from "express";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import * as cheerio from 'cheerio';

const app = express();
const port = 3000;

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

// Recursive function to get files
function getFiles(dir, files = []) {
  // Get an array of all files and directories in the passed directory using fs.readdirSync
  const fileList = fs.readdirSync(dir)
  // Create the full path of the file/directory by concatenating the passed directory and file/directory name
  for (const file of fileList) {
    const name = `${dir}/${file}`
    // Check if the current file/directory is a directory using fs.statSync
    if (fs.statSync(name).isDirectory()) {
      // If it is a directory, recursively call the getFiles function with the directory path and the files array
      getFiles(name, files)
    } else {
      // If it is a file, push the full path to the files array
      files.push(file)
    }
  }
  return files
}


function Render(res, view, variables = {})
{
  const files = getFiles("views");
  const fileNames = files.map(file => path.basename(file, '.ejs'));
  return res.render(view , {...variables, files: fileNames });
}

app.get("/", (req, res) => {
  Render(res, "index.ejs");
});

app.get("/:page", (req, res) => {
  console.log(req.params.page);
  Render(res, req.params.page + ".ejs");
});


app.post("/submit", (req, res) => {
  const blogTitle = req.body["title"];
  const contentContent = req.body["content"];
  const lineBreaks = (contentContent.match(/\n/g) || []).length;
  const content = contentContent.replace(/\n/g, "<br>");
  const filePath = path.join('views', blogTitle + '.ejs');

  const ejsContent = `
  <head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="/styles/main.css">
  <title>Grid Layout</title>
  </head>
  <body>
  <div class="container">
    <header class="header">Header</header>
    <aside class="sidebar">Posts
      <ul>
        <li><a href="index">Main Page</a></li>
        <% files.forEach(function(file) { %>
          <% if (file !== 'index' && file !== 'edit') { %>
            <li>
              <a href="/<%= file %>"><%= file %></a>
              <br>
              <form action="/delete" method="POST" style="display:inline;">
                <input type="hidden" name="filename" value="<%= file %>">
                <button type="submit">Delete</button>
              </form>
              <form action="/edit" method="POST" style="display:inline;">
                <input type="hidden" name="filename" value="<%= file %>">
                <button type="submit">Edit</button>
              </form>
            </li>
          <% } %>
        <% }); %>
      </ul>
    </aside>
    <div>
      <h1 class="main-content" id="Title">${blogTitle}</h1>
      <p class="main-content" id="Content">${content}</p>
    </div>
    <footer class="footer">Footer</footer>
  </div>
</body>
    `;

  fs.writeFile(filePath, ejsContent, (err) => {
    if (err) {
      console.error('Error writing file:', err);
    } else {
      console.log('EJS file created successfully at', filePath);
    }
  });

  res.redirect('/');
});

app.post('/delete', (req, res) => {
  const filename = req.body.filename;
  const filePath = path.join('views', `${filename}.ejs`);

  fs.unlink(filePath, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error deleting file');
    }
    console.log(`Deleted file: ${filename}.ejs`);
    res.redirect('/');
  });
});

app.post('/edit', (req, res) => {
  const files = getFiles("views");
  const fileNames = files.map(file => path.basename(file, '.ejs'));
  const filename = req.body.filename;
  const filePath = path.join('views', `${filename}.ejs`);


  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error reading file');
    }
    const $ = cheerio.load(data);
    const Title = $("#Title").text();
    const Content = $("#Content").text();
    console.log(Title, Content); 
    Render(res, "edit.ejs", {Title, Content});
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Error deleting file');
      }
      console.log(`Deleted file: ${filename}.ejs`);
    });
  });
});

app.listen(port, () => { 
  console.log(`Server is running on port ${port}`);
});

