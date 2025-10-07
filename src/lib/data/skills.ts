export const skills = [
	// Core Technologies (Primary color - #ffcfa0)
	{ name: 'Node.js', category: 'core' },
	{ name: 'TypeScript', category: 'core' },
	{ name: 'JavaScript', category: 'core' },
	{ name: 'Python', category: 'core' },
	{ name: 'Django', category: 'core' },
	{ name: 'Solidity', category: 'core' },
	{ name: 'Rust', category: 'core' },
	{ name: 'Next.js', category: 'core' },
	{ name: 'Go', category: 'core' },
	// Systems & Architecture (Blue)
	{ name: 'Microservices', category: 'systems' },
	{ name: 'REST APIs', category: 'systems' },
	{ name: 'gRPC', category: 'systems' },
	{ name: 'tRPC', category: 'systems' },
	{ name: 'WebSockets', category: 'systems' },
	{ name: 'Event-driven', category: 'systems' },
	{ name: 'ETL', category: 'systems' },
	{ name: 'Linux', category: 'systems' },
	// Infrastructure & Cloud (Green)
	{ name: 'Cloudflare', category: 'infra' },
	{ name: 'AWS', category: 'infra' },
	{ name: 'Docker', category: 'infra' },
	{ name: 'Kubernetes', category: 'infra' },
	{ name: 'Apache', category: 'infra' },
	{ name: 'NGINX', category: 'infra' },
	{ name: 'Kafka', category: 'infra' },
	{ name: 'CI/CD', category: 'infra' },
	{ name: 'Datadog', category: 'infra' },
	{ name: 'Git', category: 'infra' },
	// Databases (Purple)
	{ name: 'PostgreSQL', category: 'database' },
	{ name: 'Redis', category: 'database' },
	{ name: 'MongoDB', category: 'database' },
	{ name: 'IPFS', category: 'database' },
	{ name: 'Timeseries', category: 'database' },
	{ name: 'Supabase', category: 'database' },
	{ name: 'D1', category: 'database' },
	{ name: 'R2', category: 'database' },
	{ name: 'KV', category: 'database' },
	{ name: 'SQL', category: 'database' },
	// AI & Automation (Orange)
	{ name: 'AI Agents', category: 'ai' },
	{ name: 'LLM', category: 'ai' },
	{ name: 'MCP', category: 'ai' },
	{ name: 'n8n', category: 'ai' },
	// Blockchain & Security (Red)
	{ name: 'Smart Contracts', category: 'blockchain' },
	{ name: 'Foundry', category: 'blockchain' },
	{ name: 'EVM', category: 'blockchain' },
	{ name: 'Solana', category: 'blockchain' },
	{ name: 'ERC4337', category: 'blockchain' },
	{ name: 'Digital Signatures', category: 'blockchain' },
	// UI (Teal)
	{ name: 'Vite', category: 'ui' },
	{ name: 'Svelte', category: 'ui' },
	{ name: 'Tailwind CSS', category: 'ui' },
	{ name: 'React', category: 'ui' }
];

export const categoryColors: Record<string, string> = {
	core: '#ffcfa0',      // Primary color (warm orange)
	systems: '#60a5fa',   // Blue
	infra: '#34d399',     // Green
	database: '#a78bfa',  // Purple
	ai: '#fb923c',        // Orange
	blockchain: '#f87171', // Red
	ui: '#22d3ee'         // Teal
};

export const categoryLabels: Record<string, string> = {
	core: 'core technologies',
	systems: 'systems & architecture',
	infra: 'infrastructure & cloud',
	database: 'databases',
	ai: 'ai & automation',
	blockchain: 'blockchain & security',
	ui: 'ui'
};
