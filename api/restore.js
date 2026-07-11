// /api/restore.js
// Vercel serverless function: "Restore Old Photo"
//
// Sends the uploaded image to Replicate's GFPGAN model (face restoration +
// scratch/damage repair) and returns the result as a base64 data string.
//
// Requires an environment variable REPLICATE_API_TOKEN, set in your
// Vercel project settings (or a local .env file when running `vercel dev`).

const REPLICATE_API_URL = 'https://api.replicate.com/v1/predictions';

// tencentarc/gfpgan — face restoration for old/damaged photos
const MODEL_VERSION =
  '9283608cc6b7be6b65a8e44983db012355fde4132009bf99d976529c0dccccf';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) {
    return res.status(500).json({
      error: 'Server is missing REPLICATE_API_TOKEN. Add it in your Vercel project settings.'
    });
  }

  try {
    const { image, mimeType } = req.body || {};
    if (!image) {
      return res.status(400).json({ error: 'No image was provided.' });
    }

    const dataUri = `data:${mimeType || 'image/jpeg'};base64,${image}`;

    // 1. Create a prediction
    const createResp = await fetch(REPLICATE_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version: MODEL_VERSION,
        input: {
          img: dataUri,
          version: 'v1.4',
          scale: 2
        }
      })
    });

    if (!createResp.ok) {
      const errBody = await createResp.text();
      console.error('Replicate create error:', errBody);
      return res.status(502).json({ error: 'The restoration model could not be reached.' });
    }

    let prediction = await createResp.json();

    // 2. Poll until the prediction finishes (Vercel serverless functions
    //    support this within their execution time limit for typical images).
    const start = Date.now();
    const TIMEOUT_MS = 55000;

    while (
      prediction.status !== 'succeeded' &&
      prediction.status !== 'failed' &&
      prediction.status !== 'canceled'
    ) {
      if (Date.now() - start > TIMEOUT_MS) {
        return res.status(504).json({ error: 'Restoration is taking longer than expected. Please try again.' });
      }
      await new Promise((r) => setTimeout(r, 1500));

      const pollResp = await fetch(`${REPLICATE_API_URL}/${prediction.id}`, {
        headers: { Authorization: `Token ${apiToken}` }
      });
      prediction = await pollResp.json();
    }

    if (prediction.status !== 'succeeded') {
      console.error('Replicate prediction failed:', prediction.error);
      return res.status(502).json({ error: 'The restoration model failed to process this photo.' });
    }

    const outputUrl = Array.isArray(prediction.output)
      ? prediction.output[prediction.output.length - 1]
      : prediction.output;

    // 3. Fetch the result and return it as base64 so the client can render
    //    and download it without a second round trip.
    const imgResp = await fetch(outputUrl);
    const arrayBuffer = await imgResp.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    return res.status(200).json({ image: `data:image/jpeg;base64,${base64}` });
  } catch (err) {
    console.error('Restore function error:', err);
    return res.status(500).json({ error: 'Unexpected server error while restoring this photo.' });
  }
};
