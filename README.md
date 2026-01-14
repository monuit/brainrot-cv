# Brainrot

A browser-based computer vision app that detects facial expressions and hand gestures to match you with viral memes in real-time. Built with React, MediaPipe, and pure chaos.

<img src="https://github.com/monuit/brainrot-cv/blob/main/assets/cat-disgust.jpeg" width="300">

---

## Introduction

**Brainrot** is a CV program that maps human facial expressions (and hand gestures!) to popular meme reactions in real time.

Using your webcam and the MediaPipe library, the system tracks key facial landmarks and displays a corresponding meme when it detects specific expressions.

**Supported Expressions (~14):**
- Shock, Scream, Tongue, Happy, Sad, Wink
- Glare, Suspicious, Sleepy, Eyebrow raise
- Confused, Pout, Disgust, Kissy, Neutral

**Supported Gestures (9):**
- Middle Finger, Peace, Thumbs Up/Down
- OK, Rock On, Wave, Fist, Pointing

---

## How it works

1. Your webcam feed is processed in real time using **MediaPipe Tasks Vision**.
2. Facial landmarks and hand gestures are extracted directly in the browser.
3. Heuristics determine which expression is active.
4. A matching meme is displayed instantly.

---

## Installation

### 1. Clone the repository
```bash
git clone https://github.com/monuit/brainrot-cv.git
cd brainrot-cv
```

### 2. Install dependencies
Make sure you have **Node.js 18+** or **Bun** installed.

```bash
# using bun (recommended)
bun install

# using npm
npm install
```

### 3. Run the program
```bash
# using bun
bun run dev

# using npm
npm run dev
```

Open http://localhost:3000 in your browser.

---

## Configuration

You can customize sensitivity and thresholds in `src/lib/config.ts`.

### Expression Thresholds
Adjust how easily expressions are triggered:

```typescript
export const CONFIG = {
    thresholds: {
        eyeOpening: 0.03,       // Shock detection
        mouthOpen: 0.025,       // Tongue/mouth open detection
        squinting: 0.018,       // Glare detection
        smile: 0.012,           // Smile detection
        // ...
    },
    // ...
}
```

### Transition Timings
Control how fast memes switch:

```typescript
    transitions: {
        holdTime: 300,          // Must hold expression for 300ms
        debounce: 500,          // Wait 500ms before next switch
        crossfadeDuration: 300, // Visual fade duration
    },
```

---

## Contributing

1. Fork the repository
2. Create a new branch (`git checkout -b feat/new-meme`)
3. Add new memes to `src/assets/expressions/`
4. Commit your changes
5. Push your branch and open a pull request

---

## License

This project is licensed under the MIT License.
See the [LICENSE](LICENSE) file for details.

---

Have fun 🧠⬛
