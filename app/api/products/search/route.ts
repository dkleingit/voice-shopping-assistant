import { OpenAI } from 'openai';
import { PRODUCTS } from '@/lib/products';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  const { name } = await req.json();

  if (!name) {
    return new Response(
      JSON.stringify({ error: 'Product name is required' }),
      { status: 400 }
    );
  }

  try {
    // Get the embedding for the query
    const queryEmbedding = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: [name],
    });
    const queryVector = queryEmbedding.data[0].embedding;

    // Calculate similarity for each product
    const similarities = await Promise.all(
      PRODUCTS.map(async (product) => {
        const productEmbedding = await openai.embeddings.create({
          model: 'text-embedding-ada-002',
          input: [product.name + ' ' + product.description],
        });
        const productVector = productEmbedding.data[0].embedding;
        const similarity = cosineSimilarity(queryVector, productVector);
        return { product, similarity };
      })
    );

    // Find the most similar product
    const mostSimilarProduct = similarities
      .filter(({ similarity }) => similarity > 0.5) // Adjust threshold as needed
      .sort((a, b) => b.similarity - a.similarity)[0]?.product;

    return new Response(
      JSON.stringify({ success: !!mostSimilarProduct, product: mostSimilarProduct || null }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error searching product:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
}

// Cosine similarity calculation
function cosineSimilarity(vecA: any[], vecB: any[]) {
  const dotProduct = vecA.reduce((acc, val, index) => acc + val * vecB[index], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}
