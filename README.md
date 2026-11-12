# Director

A creative director in your pocket for fashion shoots. Describe the shoot and get a shot list. Each shot has a framing sketch, the camera move, a gimbal tip and a length. You also get golden-hour times for the day, and a shoot mode that goes through the shots one at a time.

- **Brief:** the idea, the pieces to feature, the spot, the date, the format (9:16, 4:5 or 16:9), the length (15, 30 or 60 seconds) and reference images.
- **Built-in planner:** works without AI or internet. It reads the brief for the setting (street, studio, night, product) and the energy (calm or loud), then builds an edit: an opening shot, an introduction, details for every piece, movement, a hero shot and an ending. The shot lengths add up to the target. Tap **New version** for an alternative.
- **AI plans (optional):** add your own Claude API key in Settings for a plan written for your brief. The key stays on the device.
- **Light:** sunrise, sunset, golden hour and blue hour for any date and town, worked out on the device.
- **Shoot mode:** one big card per shot with a hold timer and **Got it ✓**. Your progress is saved, and the screen stays awake.
- **Private:** shoots and reference photos are saved only on your device.

## Run it

```
npm install
npm run dev
npm test      # planner, golden hour (checked against published Birmingham times), AI response handling
```

## Put it online (GitHub Pages)

The files must sit at the top level of the repo, with `package.json` next to `.github`.

```
cd director
git init && git add -A && git commit -m "Director"
git branch -M main
git remote add origin https://github.com/Bhigayo/director.git
git push -u origin main
```

Then, on GitHub, go to **Settings → Pages → Source: GitHub Actions**. The site will be at `https://bhigayo.github.io/director/`.
