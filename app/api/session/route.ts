import { NextResponse } from 'next/server';

const DEFAULT_INSTRUCTIONS = `You are helpful shopping assistant. Whenever you mention a product, always call displayProductInfo with the product's ID — even if you've already shown it before. Always display the list of products if asked, even if you've already shown the list before.`;

export async function GET() {
  const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-realtime-preview",
      instructions: DEFAULT_INSTRUCTIONS,
      voice: "ash",
    }),
  });

  const result = await response.json();

  console.log(result);

  return NextResponse.json(result);
}