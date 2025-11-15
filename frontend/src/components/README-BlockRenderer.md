# BlockRenderer Component

## Purpose

Renders dynamic content blocks from Strapi's About page (or any page using similar dynamic zones).

## Usage

```tsx
import BlockRenderer from '../components/BlockRenderer';

const blocks = [
  {
    __component: 'shared.media',
    id: 1,
    file: { url: '/image.jpg', ... }
  },
  {
    __component: 'shared.quote',
    id: 2,
    quoteText: "Design is thinking made visual.",
    name: "Saul Bass"
  }
];

<BlockRenderer blocks={blocks} />
```

## Supported Block Types

### 1. Media (`shared.media`)

**Purpose:** Display single image or video

**Properties:**
- `file.url` - Media URL
- `file.formats` - Different image sizes (large, medium, small, thumbnail)
- `file.alternativeText` - Alt text for accessibility
- `file.caption` - Optional caption displayed below
- `file.mime` - MIME type (used to detect videos)

**Rendering:**
- Images: Full-width, 4:3 aspect ratio
- Videos: HTML5 video player with controls
- Caption: Centered, italic, gray text

### 2. Quote (`shared.quote`)

**Purpose:** Display styled blockquote with attribution

**Properties:**
- `quoteText` - The quote content
- `name` - Author/attribution

**Rendering:**
- Large serif font (4xl-6xl)
- Centered layout
- Generous padding (100px vertical)
- Author in italic with em dash

### 3. Rich Text (`shared.rich-text`)

**Purpose:** Render markdown-formatted content

**Properties:**
- `body` - Markdown content

**Supported Markdown:**
- Headings (H1, H2, H3)
- Paragraphs
- Lists (ordered and unordered)
- Links (opens in new tab)
- Blockquotes
- **Bold** and *italic* text
- GitHub Flavored Markdown (tables, strikethrough, etc.)

**Custom Styling:**
- All typography matches site design system
- Headings use serif font, light weight
- Body text uses sans-serif, gray-700
- Links are underlined with hover effect

### 4. Slider (`shared.slider`)

**Purpose:** Display image gallery in responsive grid

**Properties:**
- `files` - Array of image objects
- Each file has `url`, `formats`, `alternativeText`

**Rendering:**
- 1 image: Full width
- 2 images: 2 columns (1 column on mobile)
- 3+ images: 3 columns (2 columns on tablet, 1 on mobile)
- Hover effect: Slight scale animation
- Maintains 4:3 aspect ratio

## Extending the Component

To add a new block type:

1. **Define the interface:**
```tsx
interface NewBlock {
  __component: 'shared.new-block';
  id: number;
  yourField: string;
  // ... other fields
}
```

2. **Add to Block type:**
```tsx
export type Block = MediaBlock | QuoteBlock | RichTextBlock | SliderBlock | NewBlock;
```

3. **Create renderer function:**
```tsx
const NewBlockRenderer = ({ block }: { block: NewBlock }) => {
  return (
    <section className="py-16">
      {/* Your rendering logic */}
    </section>
  );
};
```

4. **Add to switch statement:**
```tsx
case 'shared.new-block':
  return <NewBlockRenderer key={block.id} block={block as NewBlock} />;
```

5. **Update populate parameter** (if your block has media relations):
```tsx
const result = await apiService.getSingleType('about', 'blocks.file,blocks.files,blocks.yourMediaField');
```

## Design Decisions

### Spacing
- Standard section padding: `py-16` (64px)
- Quote section padding: `py-24` (96px)
- Inner content max-width: `4xl` (896px)
- Container max-width: `6xl` (1152px)

### Typography
- Serif font: Used for headings and quotes
- Sans-serif font: Used for body text
- Font weights: Light (300) for headings, Regular (400) for body

### Colors
- Text: `gray-900` (headings), `gray-700` (body), `gray-600` (meta)
- Background: White (inherits from page)

### Responsive Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1024px (md breakpoint)
- Desktop: > 1024px (lg breakpoint)

## Performance

- **Type-safe:** Full TypeScript support with strict typing
- **Efficient rendering:** Only renders defined block types
- **Image optimization:** Uses Strapi's image formats for optimal sizes
- **Lazy loading:** Images load as needed (browser default)
- **No external API calls:** All data passed as props

## Accessibility

- Semantic HTML (`<section>`, `<h1>`, `<p>`, etc.)
- Alt text for all images
- ARIA labels where appropriate
- Keyboard navigation support (links, videos)
- High contrast text (WCAG AA compliant)

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires ES6+ support
- Video element for video playback
- CSS Grid for slider layout

## Dependencies

- `react-markdown` - Markdown rendering
- `remark-gfm` - GitHub Flavored Markdown support
- React 18+ (uses modern React patterns)

## Error Handling

- Unknown block types: Logs warning to console, renders nothing
- Missing data: Gracefully handles undefined/null values
- Image load failures: Browser handles with broken image icon
- Video unsupported: Shows fallback message

## Future Enhancements

Potential improvements:

1. **Image Lightbox** - Click to expand images
2. **Video Player** - Custom controls and styling
3. **Animation** - Scroll-triggered animations
4. **Lazy Loading** - Explicit lazy loading for images
5. **Error Boundaries** - React error boundaries for each block
6. **Preview Mode** - Render differently in CMS preview
7. **Analytics** - Track block interactions
8. **A11y Improvements** - Enhanced screen reader support

## Testing

To test the component:

1. Create test blocks data
2. Render with different block combinations
3. Test responsive behavior at different viewports
4. Verify markdown rendering with various inputs
5. Test image loading and error states
6. Verify video playback

Example test case:
```tsx
const testBlocks = [
  {
    __component: 'shared.media',
    id: 1,
    file: {
      url: 'https://example.com/image.jpg',
      alternativeText: 'Test image'
    }
  }
];

<BlockRenderer blocks={testBlocks} />
```

---

**Component Location:** `frontend/src/components/BlockRenderer.tsx`  
**Created:** 2025-11-15  
**Status:** ✅ Production Ready

