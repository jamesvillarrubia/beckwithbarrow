/**
 * BlockRenderer Component
 * 
 * Renders dynamic zone blocks from Strapi's About page content type.
 * Supports the following block types:
 * - shared.media: Single image/video/file display
 * - shared.quote: Blockquote with author attribution
 * - shared.rich-text: Markdown-formatted rich text content
 * - shared.slider: Image carousel/gallery
 * 
 * Each block type has its own sub-component for clean separation of concerns.
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Type definitions for Strapi block components
 */

interface StrapiMedia {
  id: number;
  url: string;
  formats?: {
    large?: { url: string };
    medium?: { url: string };
    small?: { url: string };
    thumbnail?: { url: string };
  };
  alternativeText?: string;
  caption?: string;
  mime?: string;
}

interface MediaBlock {
  __component: 'shared.media';
  id: number;
  file: StrapiMedia;
}

interface QuoteBlock {
  __component: 'shared.quote';
  id: number;
  quoteText: string;
  name: string;
}

interface RichTextBlock {
  __component: 'shared.rich-text';
  id: number;
  body: string;
}

interface SliderBlock {
  __component: 'shared.slider';
  id: number;
  files: StrapiMedia[];
}

export type Block = MediaBlock | QuoteBlock | RichTextBlock | SliderBlock;

interface BlockRendererProps {
  blocks: Array<Record<string, unknown> & { __component: string; id: number }>;
}

/**
 * MediaBlockRenderer - Renders a single media item (image, video, or file)
 * Uses the largest available format for best quality, with fallback to original
 */
const MediaBlockRenderer = ({ block }: { block: MediaBlock }) => {
  const { file } = block;
  
  if (!file) return null;

  // Determine the best image URL to use
  const imageUrl = file.formats?.large?.url || file.url;
  
  // Check if it's a video
  const isVideo = file.mime?.startsWith('video/');

  return (
    <section className="py-16">
      <div className="max-w-6xl mx-auto px-6 md:px-12 lg:px-16">
        <div className="max-w-4xl mx-auto">
          <div className="aspect-[4/3] rounded-sm overflow-hidden">
            {isVideo ? (
              <video 
                src={file.url}
                controls
                className="w-full h-full object-cover"
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              <img 
                src={imageUrl}
                alt={file.alternativeText || 'Content image'}
                className="w-full h-full object-cover"
              />
            )}
          </div>
          {file.caption && (
            <p className="text-sm text-gray-600 mt-4 text-center italic">
              {file.caption}
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

/**
 * QuoteBlockRenderer - Renders a styled blockquote with author attribution
 * Matches the design pattern from the homepage quote section
 */
const QuoteBlockRenderer = ({ block }: { block: QuoteBlock }) => {
  const { quoteText, name } = block;

  return (
    <section className="py-24" style={{ paddingTop: '100px', paddingBottom: '100px' }}>
      <div className="max-w-6xl mx-auto px-6 md:px-12 lg:px-16 text-center">
        <h3 className="text-4xl md:text-6xl font-serif font-light leading-relaxed text-gray-900">
          "{quoteText}"
        </h3>
        {name && (
          <p className="text-xl md:text-2xl font-sans text-gray-600 mt-8 italic">
            — {name}
          </p>
        )}
      </div>
    </section>
  );
};

/**
 * RichTextBlockRenderer - Renders markdown-formatted content
 * Supports GitHub Flavored Markdown (GFM) for tables, strikethrough, etc.
 */
const RichTextBlockRenderer = ({ block }: { block: RichTextBlock }) => {
  const { body } = block;

  if (!body) return null;

  return (
    <section className="py-16">
      <div className="max-w-4xl mx-auto px-6 md:px-12 lg:px-16">
        <div className="prose prose-lg prose-gray max-w-none">
          {/* Custom markdown styles matching the site's typography */}
          <div className="text-lg md:text-xl font-sans text-gray-700 leading-relaxed">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                // Override default styles to match site typography
                h1: ({ children }) => (
                  <h1 className="text-4xl md:text-5xl font-serif font-light leading-relaxed text-gray-900 mt-8 mb-6">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-3xl md:text-4xl font-serif font-light leading-relaxed text-gray-900 mt-8 mb-6">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-2xl md:text-3xl font-serif font-light leading-relaxed text-gray-900 mt-6 mb-4">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="text-lg md:text-xl font-sans text-gray-700 leading-relaxed mb-8">
                    {children}
                  </p>
                ),
                a: ({ href, children }) => (
                  <a 
                    href={href} 
                    className="text-gray-900 underline hover:text-gray-600 transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {children}
                  </a>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside mb-8 space-y-2">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside mb-8 space-y-2">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="text-lg md:text-xl font-sans text-gray-700 leading-relaxed">
                    {children}
                  </li>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-gray-300 pl-6 italic my-8">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {body}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </section>
  );
};

/**
 * SliderBlockRenderer - Renders a grid of images
 * Uses a responsive grid layout similar to project galleries
 */
const SliderBlockRenderer = ({ block }: { block: SliderBlock }) => {
  const { files } = block;

  if (!files || files.length === 0) return null;

  return (
    <section className="py-16">
      <div className="max-w-6xl mx-auto px-6 md:px-12 lg:px-16">
        <div className={`grid gap-6 ${
          files.length === 1 ? 'grid-cols-1' :
          files.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
          'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        }`}>
          {files.map((file) => {
            const imageUrl = file.formats?.large?.url || file.url;
            
            return (
              <div key={file.id} className="aspect-[4/3] rounded-sm overflow-hidden">
                <img 
                  src={imageUrl}
                  alt={file.alternativeText || 'Gallery image'}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

/**
 * Main BlockRenderer component
 * Iterates through blocks array and renders the appropriate component for each block type
 */
const BlockRenderer = ({ blocks }: BlockRendererProps) => {
  if (!blocks || blocks.length === 0) {
    return null;
  }

  return (
    <>
      {blocks.map((block) => {
        // Render the appropriate component based on block type
        switch (block.__component) {
          case 'shared.media':
            return <MediaBlockRenderer key={block.id} block={block as unknown as MediaBlock} />;
          
          case 'shared.quote':
            return <QuoteBlockRenderer key={block.id} block={block as unknown as QuoteBlock} />;
          
          case 'shared.rich-text':
            return <RichTextBlockRenderer key={block.id} block={block as unknown as RichTextBlock} />;
          
          case 'shared.slider':
            return <SliderBlockRenderer key={block.id} block={block as unknown as SliderBlock} />;
          
          default:
            // Log unknown block types for debugging
            console.warn('Unknown block type:', block.__component);
            return null;
        }
      })}
    </>
  );
};

export default BlockRenderer;

