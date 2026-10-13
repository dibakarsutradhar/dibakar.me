/**
 * rehype plugin: mermaid diagram support for blog posts.
 *
 * Authors write an ordinary fenced code block; this plugin upgrades it at
 * build time into the placeholder MermaidRenderer (components/blog/) looks
 * for once the page is interactive:
 *
 *   ```mermaid
 *   graph LR
 *   A --> B
 *   ```
 *     → <pre class="mermaid">graph LR
 *   A --> B</pre>
 *
 * The diagram source stays in the HTML as text, so with JavaScript off the
 * reader still sees the (readable, if plain) source instead of nothing.
 * Hand-written <pre class="mermaid"> or <div class="mermaid"> HTML passes
 * through rehype-raw untouched and is picked up the same way.
 */
const isElement = (node, tagName) => node?.type === 'element' && node.tagName === tagName;

function walk(node) {
	if (!node.children) return;

	node.children = node.children.map((child) => {
		if (isElement(child, 'pre')) {
			const code = child.children.find((node) => isElement(node, 'code'));
			const classes = code?.properties?.className;
			const languages = Array.isArray(classes) ? classes.map(String) : [];
			if (languages.includes('language-mermaid')) {
				return {
					type: 'element',
					tagName: 'pre',
					properties: { className: ['mermaid'] },
					children: code.children
				};
			}
		}

		walk(child);
		return child;
	});
}

export function rehypeMermaid() {
	return (tree) => {
		walk(tree);
	};
}

export default rehypeMermaid;
