# Press Articles Data

Extracted from https://www.karenbeckwith.com/press

## Article 1: New England Home - Contemporary Farmhouse
- **Title**: A Contemporary Farmhouse in Williamstown
- **Source**: New England Home
- **Date**: September 2021 (estimated from image timestamp: 1632866618911)
- **Link**: https://www.nehomemag.com/a-contemporary-farmhouse-in-williamstown/
- **Image URL**: https://images.squarespace-cdn.com/content/v1/53f78935e4b06aa2bfc2d069/1632866618911-5G2X7F0MF7GO3QTG1Q3B/Karen+Beckwith+Creative+New+England+Home.jpg
- **Image Alt Text**: Cover of New England Home Karen Beckwith Creative
- **Image Dimensions**: 750x1019

---

## Article 2: The Berkshire Edge - When Life Changes
- **Title**: When Life Changes, Design Supports
- **Source**: The Berkshire Edge
- **Date**: January 2019 (estimated from image timestamp: 1548257202838)
- **Link**: https://theberkshireedge.com/real-estate/when-life-changes-design-supports/
- **Image URL**: https://images.squarespace-cdn.com/content/v1/53f78935e4b06aa2bfc2d069/1548257202838-I7EFWUMZLW2HI3CAYR15/the-edge-logo.gif
- **Image Alt Text**: The Berkshire Edge Logo
- **Image Dimensions**: 300x300

---

## Article 3: Boston Magazine - Berkshire Bliss
- **Title**: Berkshire Bliss
- **Source**: Boston Magazine
- **Date**: March 6, 2012
- **Link**: https://www.bostonmagazine.com/2012/03/06/berkshire-bliss/
- **Image URL**: https://images.squarespace-cdn.com/content/v1/53f78935e4b06aa2bfc2d069/1544552411825-X0BP94SKM2LOXNYVXOI9/1203-300x382.jpg
- **Image Alt Text**: Boston Magazine
- **Image Dimensions**: 300x382

---

## Article 4: The Berkshire Edge - Island Cottage
- **Title**: Transformations: Island Cottage & Less
- **Source**: The Berkshire Edge
- **Date**: December 2018 (estimated from image timestamp: 1544550357429)
- **Link**: https://theberkshireedge.com/transformations-island-cottage-less/
- **Image URL**: https://images.squarespace-cdn.com/content/v1/53f78935e4b06aa2bfc2d069/1544550357429-0QFVDTD9STV1FHZBVVP6/the-edge-logo.gif
- **Image Alt Text**: The Berkshire Edge Logo
- **Image Dimensions**: 300x300

---

## Article 5: New England Home - Berkshire Designer Showcase
- **Title**: Notes from the Field: The Berkshire Designer Showcase at Ventfort Hall
- **Source**: New England Home
- **Date**: May-June 2011
- **Link**: https://www.nehomemag.com/notes-from-the-field-the-berkshire-designer-showcase-at-ventfort-hall/
- **Image URL**: https://images.squarespace-cdn.com/content/v1/53f78935e4b06aa2bfc2d069/1544550289081-BJ2WAUJI8MTMI4UNOR7E/May-June-2011.jpg
- **Image Alt Text**: New England Home May-June 2011
- **Image Dimensions**: 185x245

---

## Article 6: Preview Magazine - Cover Feature
- **Title**: Preview Magazine Cover Feature
- **Source**: Preview Massachusetts
- **Date**: May 2015 (estimated from image timestamp: 1431631677286)
- **Link**: https://www.karenbeckwith.com/press-preview (internal page - needs to be checked for actual article link)
- **Image URL**: https://images.squarespace-cdn.com/content/v1/53f78935e4b06aa2bfc2d069/1431631677286-8JTSZQHA9CW75GIF6F52/Preview+Cover.jpeg
- **Image Alt Text**: Karen Beckwith Interior Designer Cover of Preview Massachusetts
- **Image Dimensions**: 2500x3290

---

## Article 7: Berkshire Living - Home + Garden Feature
- **Title**: Berkshire Living Home + Garden Feature
- **Source**: Berkshire Living
- **Date**: December 2018 (estimated from image timestamp: 1544555454370)
- **Link**: https://www.karenbeckwith.com/press-berkshire-living (internal page - needs to be checked for actual article link)
- **Image URL**: https://images.squarespace-cdn.com/content/v1/53f78935e4b06aa2bfc2d069/1544555454370-9SZEI3UOIT8CVCRNJBJ2/Scan+2018-12-11+13.54.36.jpg
- **Image Alt Text**: Interior Design Firm Karen Beckwith Creative Featured in Home + Garden
- **Image Dimensions**: 1253x1626

---

## Notes

### Images to Download
All 7 images need to be downloaded and uploaded to your Strapi media library. The images are hosted on Squarespace CDN.

### Relative Links (Need Action)
Two articles (#6 and #7) have relative links that point to internal Squarespace pages:
- `/press-preview` 
- `/press-berkshire-living`

You'll need to either:
1. Visit those pages to find the actual external article links
2. Keep them as internal pages with the full article content
3. Remove the links if the full articles aren't available

### Recommended Action Order
1. Download all 7 images
2. Upload images to Strapi media library
3. Check the two relative links for actual article URLs
4. Create press items in Strapi with the structured data above

### Strapi Press Item Structure
Each press item should have:
```json
{
  "title": "Article Title",
  "source": "Publication Name",
  "date": "YYYY-MM-DD",
  "link": "https://...",
  "image": { /* Strapi media relation */ },
  "text": "Optional description or excerpt",
  "color": "Optional accent color (hex)"
}
```

