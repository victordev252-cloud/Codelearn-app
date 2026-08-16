export type TrackId = "html" | "css" | "javascript";
export type Difficulty = "Beginner" | "Intermediate" | "Advanced";

export type Lesson = {
  id: string;
  number: number;
  title: string;
  track: TrackId;
  difficulty: Difficulty;
  duration: string;
  description: string;
  objectives: string[];
  tags: string[];
  code: { html: string; css: string; javascript: string };
  quiz: { question: string; options: string[]; answer: number; explanation: string };
};

export type Track = {
  id: TrackId;
  label: string;
  eyebrow: string;
  description: string;
  accent: string;
  icon: string;
  lessons: number;
  projects: number;
};

export const tracks: Track[] = [
  { id: "html", label: "HTML foundations", eyebrow: "01 / Structure", description: "Build semantic, accessible pages from a blank document to a polished content system.", accent: "coral", icon: "</>", lessons: 24, projects: 5 },
  { id: "css", label: "CSS systems", eyebrow: "02 / Expression", description: "Turn structure into intentional interfaces with layout, motion, and a resilient design system mindset.", accent: "lavender", icon: "✦", lessons: 28, projects: 6 },
  { id: "javascript", label: "JavaScript craft", eyebrow: "03 / Interaction", description: "Make the browser think, respond, and connect to the outside world with modern JavaScript.", accent: "mint", icon: "{ }", lessons: 32, projects: 7 },
];

export const lessons: Lesson[] = [
  {
    id: "html-document-structure", number: 1, title: "The anatomy of a web page", track: "html", difficulty: "Beginner", duration: "12 min",
    description: "Learn how browsers turn a document into a living interface, then compose your first semantic page.",
    objectives: ["Explain the role of HTML in a web product", "Identify the essential document landmarks", "Write a meaningful page skeleton"],
    tags: ["foundations", "semantic HTML", "accessibility"],
    code: { html: "<!doctype html>\n<html lang=\"en\">\n  <head>\n    <title>My first page</title>\n  </head>\n  <body>\n    <main>\n      <h1>Hello, web.</h1>\n      <p>Structure creates clarity.</p>\n    </main>\n  </body>\n</html>", css: "body {\n  font-family: system-ui;\n  padding: 3rem;\n  color: #172033;\n}", javascript: "console.log('Your first page is alive.');" },
    quiz: { question: "Which element should contain the primary content of a page?", options: ["<head>", "<main>", "<footer>", "<meta>"], answer: 1, explanation: "The <main> element identifies the dominant content of the document." },
  },
  {
    id: "html-accessible-images", number: 2, title: "Images that communicate", track: "html", difficulty: "Beginner", duration: "15 min",
    description: "Use image markup, alternative text, and captions to make visual content understandable to everyone.",
    objectives: ["Choose useful alternative text", "Pair images with captions", "Recognize decorative imagery"], tags: ["accessibility", "media"],
    code: { html: "<figure>\n  <img src=\"portrait.jpg\" alt=\"A developer sketching a wireframe\">\n  <figcaption>Ideas become interfaces.</figcaption>\n</figure>", css: "figure { max-width: 28rem; margin: 0; }\nimg { width: 100%; border-radius: 1rem; }", javascript: "" },
    quiz: { question: "What is the purpose of alt text?", options: ["To style an image", "To replace the image source", "To describe meaningful image content", "To preload a font"], answer: 2, explanation: "Alt text communicates the purpose or content of an image when it cannot be perceived visually." },
  },
  {
    id: "css-layout-principles", number: 1, title: "Layout as a visual language", track: "css", difficulty: "Beginner", duration: "18 min",
    description: "Understand the box model and use modern layout primitives to create calm, responsive compositions.",
    objectives: ["Explain the box model", "Use gap to express rhythm", "Compose a responsive card grid"], tags: ["box model", "grid", "responsive"],
    code: { html: "<section class=\"grid\">\n  <article class=\"card\">A clear hierarchy</article>\n  <article class=\"card\">A calm rhythm</article>\n</section>", css: ".grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));\n  gap: 1rem;\n}\n.card { padding: 1.5rem; border: 1px solid #dfe4ea; border-radius: 1rem; }", javascript: "" },
    quiz: { question: "Which CSS property creates space between grid items?", options: ["margin", "gap", "spacing", "flow"], answer: 1, explanation: "gap expresses the space between flex or grid children without edge-case margin behavior." },
  },
  {
    id: "css-motion", number: 2, title: "Motion with intention", track: "css", difficulty: "Intermediate", duration: "20 min",
    description: "Add responsive transitions and hover states that make interactions feel natural rather than noisy.",
    objectives: ["Choose transform-friendly animations", "Build an intentional hover state", "Respect reduced-motion preferences"], tags: ["motion", "interaction"],
    code: { html: "<button class=\"lift\">Hover me</button>", css: ".lift { transition: transform 180ms ease, box-shadow 180ms ease; }\n.lift:hover { transform: translateY(-3px); box-shadow: 0 12px 30px #17203322; }\n@media (prefers-reduced-motion: reduce) { .lift { transition: none; } }", javascript: "" },
    quiz: { question: "Which property is best suited for GPU-friendly movement?", options: ["transform", "width", "margin-left", "font-size"], answer: 0, explanation: "Transform changes are composited efficiently and avoid unnecessary layout work." },
  },
  {
    id: "js-dom-events", number: 1, title: "Make the interface respond", track: "javascript", difficulty: "Beginner", duration: "22 min",
    description: "Connect a user's intent to a visible result by selecting elements, listening for events, and updating the DOM.",
    objectives: ["Select a DOM element", "Listen for a click event", "Update visible interface state"], tags: ["DOM", "events", "interaction"],
    code: { html: "<button id=\"hello\">Say hello</button>\n<p id=\"output\"></p>", css: "button { padding: .75rem 1rem; border-radius: .75rem; }", javascript: "const button = document.querySelector('#hello');\nconst output = document.querySelector('#output');\nbutton.addEventListener('click', () => {\n  output.textContent = 'Nice work — the browser is listening.';\n});" },
    quiz: { question: "Which method attaches a callback to a browser event?", options: ["listen()", "watch()", "addEventListener()", "onCallback()"], answer: 2, explanation: "addEventListener lets you register a function for a specific event type." },
  },
  {
    id: "js-async", number: 2, title: "Async JavaScript, calmly", track: "javascript", difficulty: "Intermediate", duration: "24 min",
    description: "Model asynchronous work with promises and async/await so your interfaces stay clear under real network conditions.",
    objectives: ["Describe a promise lifecycle", "Use async/await syntax", "Handle a failed request gracefully"], tags: ["async", "fetch", "APIs"],
    code: { html: "<button id=\"load\">Load profile</button>\n<pre id=\"result\"></pre>", css: "pre { background: #172033; color: #f7f9fb; padding: 1rem; border-radius: .75rem; }", javascript: "async function loadProfile() {\n  try {\n    const response = await fetch('/api/profile');\n    const profile = await response.json();\n    document.querySelector('#result').textContent = profile.name;\n  } catch (error) {\n    document.querySelector('#result').textContent = 'Try again soon.';\n  }\n}" },
    quiz: { question: "What does await do inside an async function?", options: ["Stops the browser forever", "Pauses until a promise settles", "Converts CSS to JavaScript", "Creates a new event"], answer: 1, explanation: "await pauses that async function until the promise resolves or rejects, while the browser remains responsive." },
  },
];

export const projects = [
  { id: "profile-page", title: "Your point of view", track: "HTML", difficulty: "Beginner", description: "Create an accessible profile page that introduces your interests, skills, and next step.", progress: 100, status: "Completed" },
  { id: "responsive-portfolio", title: "A portfolio with a pulse", track: "CSS", difficulty: "Intermediate", description: "Design a responsive portfolio system with a strong visual rhythm and purposeful motion.", progress: 64, status: "In progress" },
  { id: "weather-dashboard", title: "Weather, made legible", track: "JavaScript", difficulty: "Advanced", description: "Build a resilient dashboard that consumes an API, handles loading states, and communicates change.", progress: 0, status: "Not started" },
];

export function getLesson(id: string) { return lessons.find(lesson => lesson.id === id) ?? lessons[0]; }
export function getTrack(id: TrackId) { return tracks.find(track => track.id === id) ?? tracks[0]; }
export const featuredLesson = lessons[4];
