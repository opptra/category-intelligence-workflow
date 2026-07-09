const SCOPED_ATTRIBUTES = [
  { id: '1.1', attribute: 'Product Title', pillar: 'Search & Text', weight: 10 },
  { id: '1.2', attribute: 'Feature Bullets', pillar: 'Search & Text', weight: 9 },
  { id: '1.4', attribute: 'Keyword / Search Footprint', pillar: 'Search & Text', weight: 9 },
  { id: '2.1', attribute: 'Main / Hero Image', pillar: 'Visual', weight: 10 },
  { id: '2.2', attribute: 'Image Count & Slot Utilization', pillar: 'Visual', weight: 8 },
  { id: '2.3', attribute: 'Image Type Mix', pillar: 'Visual', weight: 9 },
  { id: '2.4', attribute: 'Lifestyle Imagery', pillar: 'Visual', weight: 8 },
  { id: '2.5', attribute: 'Infographic & Size-Guide Images', pillar: 'Visual', weight: 8 },
  { id: '3.1', attribute: 'A+ Presence', pillar: 'A+ Content', weight: 8 },
  { id: '3.2', attribute: 'A+ Module Depth & Design', pillar: 'A+ Content', weight: 8 },
  { id: '3.3', attribute: 'A+ Topic Coverage', pillar: 'A+ Content', weight: 7 },
  { id: '4.1', attribute: 'Specification Completeness', pillar: 'Specs', weight: 8 },
  { id: '4.2', attribute: 'Category-Critical Attributes', pillar: 'Specs', weight: 9 },
  { id: '4.3', attribute: 'Dimensions & Size', pillar: 'Specs', weight: 8 },
  { id: '4.4', attribute: 'Material & Fabric Composition', pillar: 'Specs', weight: 8 },
  { id: '4.5', attribute: 'Opacity / Blackout Level', pillar: 'Specs', weight: 9 },
  { id: '5.1', attribute: 'Price Positioning', pillar: 'Price & Value', weight: 8 },
  { id: '6.1', attribute: 'Average Star Rating', pillar: 'Reviews', weight: 9 },
  { id: '6.2', attribute: 'Review Volume', pillar: 'Reviews', weight: 9 },
  { id: '6.3', attribute: 'Star Distribution Shape', pillar: 'Reviews', weight: 7 },
  { id: '6.5', attribute: 'Review Theme Mining — Praise', pillar: 'Reviews', weight: 9 },
  { id: '6.6', attribute: 'Review Theme Mining — Complaints', pillar: 'Reviews', weight: 9 },
  { id: '6.7', attribute: 'Review-vs-Claim Corroboration', pillar: 'Reviews', weight: 9 },
  { id: '7.1', attribute: 'Best Sellers Rank', pillar: 'Marketplace', weight: 8 },
  { id: '8.4', attribute: 'Claim Consistency Across Surfaces', pillar: 'Cross-Cutting', weight: 8 },
  { id: '8.5', attribute: 'Content Hygiene', pillar: 'Cross-Cutting', weight: 6 }
];

const FUTURE_NEEDS_COLLECTION = [
  { attribute_id: '1.3', name: 'Product Description', reason: 'low priority; most leaders use A+ instead' },
  { attribute_id: '2.8', name: 'Product Video', reason: 'not scraped' },
  { attribute_id: '5.3', name: 'Promotions / Deals', reason: 'not scraped' },
  { attribute_id: '6.9', name: 'Q&A Coverage', reason: 'not scraped' },
  { attribute_id: '7.2', name: 'Badges', reason: 'not scraped' },
  { attribute_id: '7.3', name: 'Organic Search Visibility', reason: 'not scraped' },
  { attribute_id: '7.4', name: 'Advertising Presence', reason: 'not scraped' },
  { attribute_id: '8.1', name: 'Prime / Fulfillment', reason: 'not scraped' },
  { attribute_id: '8.2', name: 'Delivery Promise', reason: 'not scraped' },
  { attribute_id: '8.3', name: 'Stock Availability', reason: 'not scraped' },
  { attribute_id: '8.5-seller', name: 'Seller Reputation', reason: 'not scraped' },
  { attribute_id: '9.1', name: 'Brand Store', reason: 'not scraped' }
];

function getAttributeById(id) {
  return SCOPED_ATTRIBUTES.find((a) => a.id === id);
}

module.exports = {
  SCOPED_ATTRIBUTES,
  FUTURE_NEEDS_COLLECTION,
  getAttributeById
};
