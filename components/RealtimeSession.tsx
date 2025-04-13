'use client';

import { useEffect, useState } from 'react';
import { PRODUCTS } from '@/lib/products';

export default function RealtimeSession() {
	const [foundProduct, setFoundProduct] = useState<null | (typeof PRODUCTS)[0]>(null);
	const [showList, setShowList] = useState(false);
	const [productList, setProductList] = useState<typeof PRODUCTS>([]);

	useEffect(() => {
		const toolFunctions = {
			getAllProducts: async () => {
				setShowList(true);
				setFoundProduct(null);
				setProductList(PRODUCTS); 
				return { success: true, products: PRODUCTS };
			},
			searchProduct: async ({ name, description }: { name?: string; description?: string }) => {
				try {
					setFoundProduct(null);
					setShowList(false);
			
					const res = await fetch('/api/products/search', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ name, description }),
					});
			
					const data = await res.json();
			
					if (data.success && data.product) {
						setFoundProduct(data.product);
						return { success: true, product: data.product };
					} else {
						return { success: false, message: 'No similar product found.' };
					}
				} catch (err) {
					console.error('Search error:', err);
					setShowList(true);
					setProductList(PRODUCTS);
					return { success: false, message: 'Search failed.' };
				}
			},			
			displayProductInfo: async ({ productId }: { productId: number }) => {
				const product = PRODUCTS.find((p) => p.id === productId);
				if (product) {
					setFoundProduct(product);
					setShowList(false);
					return { success: true, product };
				} else {
					setFoundProduct(null);
					return { success: false, message: 'Product not found' };
				}
			},
		};

		const peerConnection = new RTCPeerConnection();

		peerConnection.ontrack = (event) => {
			const el = document.createElement('audio');
			el.srcObject = event.streams[0];
			el.autoplay = el.controls = true;
			document.body.appendChild(el);
		};

		const dataChannel = peerConnection.createDataChannel('oai-events');

		function configureData() {
			const event = {
				type: 'session.update',
				session: {
					modalities: ['text', 'audio'],
					tools: [
						{
							type: 'function',
							name: 'searchProduct',
							description: 'Searches for a product by name and/or description using semantic similarity',
							parameters: {
								type: 'object',
								properties: {
									name: {
										type: 'string',
										description: 'The name of the product to search for',
									},
									description: {
										type: 'string',
										description: 'The description or features of the product',
									},
								},
								required: [],
							},
						},
						{
							type: 'function',
							name: 'getAllProducts',
							description: 'Retrieves all the products',
							parameters: {
								type: 'object',
								properties: {},
								required: [],
							},
						},
						{
							type: 'function',
							name: 'displayProductInfo',
							description: 'Displays product information by ID',
							parameters: {
								type: 'object',
								properties: {
									productId: { type: 'number', description: 'Product ID to display' },
								},
								required: ['productId'],
							},
						}
					],
				},
			};
			dataChannel.send(JSON.stringify(event));
		}

		dataChannel.addEventListener('open', (ev) => {
			configureData();
		});

		dataChannel.addEventListener('message', async (ev) => {
			const msg = JSON.parse(ev.data);
			if (msg.type === 'response.function_call_arguments.done') {
				const name = msg.name as keyof typeof toolFunctions;
				const fn = toolFunctions[name];
				if (fn) {
					const args = JSON.parse(msg.arguments || '{}');
					const result = await fn(args);
					const response = {
						type: 'conversation.item.create',
						item: {
							type: 'function_call_output',
							call_id: msg.call_id,
							output: JSON.stringify(result),
						},
					};
					dataChannel.send(JSON.stringify(response));
					dataChannel.send(JSON.stringify({ type: 'response.create' }));
				}
			}
		});

		navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
			stream.getTracks().forEach((track) => peerConnection.addTransceiver(track, { direction: 'sendrecv' }));

			peerConnection.createOffer().then((offer) => {
				peerConnection.setLocalDescription(offer);
				fetch('/api/session')
					.then((res) => res.json())
					.then((data) => {
						const key = data.client_secret.value;
						const baseUrl = 'https://api.openai.com/v1/realtime';
						const model = 'gpt-4o-realtime-preview';

						fetch(`${baseUrl}?model=${model}`, {
							method: 'POST',
							body: offer.sdp,
							headers: {
								Authorization: `Bearer ${key}`,
								'Content-Type': 'application/sdp',
							},
						})
							.then((r) => r.text())
							.then((answer) => {
								peerConnection.setRemoteDescription({ sdp: answer, type: 'answer' });
							});
					});
			});
		});
	}, []);

	return (
		<div className="mt-6 max-w-4xl mx-auto px-4">
			{showList && (
				<div className="grid gap-4 sm:grid-cols-2">
					{productList.map((product) => (
						<div
							key={product.id}
							className="border rounded-xl p-4 shadow-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 cursor-pointer"
							onClick={() => setFoundProduct(product)}
						>
							<img
								src={product.image}
								alt={product.name}
								className="w-full h-40 object-cover rounded-md mb-2"
							/>
							<h3 className="text-xl font-semibold">{product.name}</h3>
							<p className="text-blue-600 dark:text-blue-400 font-medium">{product.price}</p>
							<p className="text-sm text-gray-600 dark:text-gray-300">{product.shortDescription}</p>
						</div>
					))}
				</div>
			)}

			{foundProduct && !showList && (
				<div className="flex flex-col sm:flex-row gap-6 mt-6 items-start border rounded-2xl p-6 shadow-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
					<img
						src={foundProduct.image}
						alt={foundProduct.name}
						className="w-48 h-48 object-cover rounded-xl"
					/>
					<div>
						<h2 className="text-2xl font-bold mb-1">{foundProduct.name}</h2>
						<p className="text-xl font-medium text-blue-600 dark:text-blue-400 mb-2">
							{foundProduct.price}
						</p>
						<p className="text-gray-700 dark:text-gray-300 mb-4">{foundProduct.description}</p>
						<ul className="list-disc list-inside mb-2">
							{foundProduct.specs?.map((spec, i) => (
								<li key={i}>{spec}</li>
							))}
						</ul>
						<p className="text-sm">
							<strong>Available sizes:</strong> {foundProduct.sizes.join(', ')}
						</p>
						<p className="text-sm">
							<strong>Available colors:</strong> {foundProduct.colors.join(', ')}
						</p>
					</div>
				</div>
			)}
		</div>
	);
}
