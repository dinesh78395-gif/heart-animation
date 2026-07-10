# ❤️ Animated Love Message

A fun animation where hearts fly from a character's hand and form a big heart shape with a sweet message!

## What It Does

- Shows your picture with a bounce animation
- 500 little hearts fly out and form one big heart
- Hearts have sparkle and glow effects
- Displays your custom message
- Optional background music
- Works on phones, tablets, and computers

## How to Use

1. Download all the files
2. Replace `286b58618e81d885e270cc2f362f6e47.jpg` with your own picture
3. Open `index.html` in any web browser
4. That's it! The animation will start automatically

## Files You Need

- `index.html` - The main file (open this in your browser)
- `style.css` - Makes everything look pretty
- `script.js` - Makes the hearts move
- Your picture (JPG file)

## How to Change Things

### Change Your Message

Open `index.html` and find this line:
```html
<h1 id="love-text" class="love-text">love you patootie<span class="heart-glyph">❤</span></h1>
```
Change "love you patootie" to whatever you want!

### Change Heart Color

Open `style.css` and find:
```css
--heart-red: #ff4d6d;
```
Replace `#ff4d6d` with any color code you like.

### Add Music (Optional)

1. Create a folder named `assets`
2. Put your music file inside and name it `music.mp3`
3. Click "Play Music" button when you open the page

### Make More or Fewer Hearts

Open `script.js` and find:
```javascript
particleCount: 500,
```
Change 500 to a bigger number (more hearts) or smaller number (fewer hearts).

## Common Issues

**Hearts don't start from the right spot:**
- Open `index.html` and look for `right: 10%; top: 60%`
- Change these numbers until the hearts come from the finger/hand in your picture

**Animation is slow:**
- Lower the `particleCount` number in `script.js`

**Music doesn't play:**
- Make sure your music file is in the `assets` folder
- Make sure it's named exactly `music.mp3`

## Works On

- Chrome, Firefox, Safari, Edge
- iPhones and Android phones
- Tablets and computers

---

Made with ❤️ for someone special!
