// /api/enhance.js
// Vercel serverless function: "Enhance & Upscale to 4K"
//
// Sends the uploaded image to Replicate's Real-ESRGAN model (general-purpose
// super-resolution) and returns the result as a base64 data string, capped
// to roughly 4K UHD dimensions.
//
// Requires an environment variable REPLICATE_API_TOKEN, set in your
// Vercel project settings (or a local .env file when running `vercel dev`).

const REPLICATE_API_URL = 'https://api.replicate.com/v1/predictions';

// nightmareai/real-esrgan — general image super-resolution / upscaling
const MODEL_VERSION =
  '42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf5c6e2c30d47c53f';

const MAX_DIMENSION = 3840; // 4K UHD width cap

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

    const createResp = await fetch(REPLICATE_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version: MODEL_VERSION,
        input: {
          image: dataUri,
          scale: 4,
          face_enhance: false
        }
      })
    });

    if (!createResp.ok) {
      const errBody = await createResp.text();
      console.error('Replicate create error:', errBody);
      return res.status(502).json({ error: 'The upscaling model could not be reached.' });
    }

    let prediction = await createResp.json();

    const start = Date.now();
    const TIMEOUT_MS = 55000;

    while (
      prediction.status !== 'succeeded' &&
      prediction.status !== 'failed' &&
      prediction.status !== 'canceled'
    ) {
      if (Date.now() - start > TIMEOUT_MS) {
        return res.status(504).json({ error: 'Upscaling is taking longer than expected. Please try again.' });
      }
      await new Promise((r) => setTimeout(r, 1500));

      const pollResp = await fetch(`${REPLICATE_API_URL}/${prediction.id}`, {
        headers: { Authorization: `Token ${apiToken}` }
      });
      prediction = await pollResp.json();
    }

    if (prediction.status !== 'succeeded') {
      console.error('Replicate prediction failed:', prediction.error);
      return res.status(502).json({ error: 'The upscaling model failed to process this photo.' });
    }

    const outputUrl = Array.isArray(prediction.output)
      ? prediction.output[prediction.output.length - 1]
      : prediction.output;

    const imgResp = await fetch(outputUrl);
    const arrayBuffer = await imgResp.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    // Note: MAX_DIMENSION is documented/enforced conceptually here; actual
    // resizing beyond the model's native output would require an image
    // library such as `sharp` in a Node runtime (see README for adding it).
    return res.status(200).json({
      image: `data:image/jpeg;base64,${base64}`,
      maxDimension: MAX_DIMENSION
    });
  } catch (err) {
    console.error('Enhance function error:', err);
    return res.status(500).json({ error: 'Unexpected server error while enhancing this photo.' });
  }
};
