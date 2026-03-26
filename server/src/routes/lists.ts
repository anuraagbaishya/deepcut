import { Router, Request, Response } from 'express';
import List from '../models/List';

const router = Router();

// GET /api/lists - returns all lists without items
router.get('/', async (_req: Request, res: Response) => {
  try {
    const lists = await List.find({}, { items: 0 }).lean();
    res.json(lists);
  } catch (err) {
    console.error('Error fetching lists:', err);
    res.status(500).json({ error: 'Failed to fetch lists' });
  }
});

// GET /api/lists/:slug - returns full list including all items
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const list = await List.findOne({ slug: req.params.slug }).lean();
    if (!list) {
      res.status(404).json({ error: 'List not found' });
      return;
    }
    res.json(list);
  } catch (err) {
    console.error('Error fetching list:', err);
    res.status(500).json({ error: 'Failed to fetch list' });
  }
});

// POST /api/lists - create a new list
router.post('/', async (req: Request, res: Response) => {
  try {
    const { slug, title, category, description, items } = req.body;
    if (!slug || !title || !category || !description) {
      res.status(400).json({ error: 'slug, title, category, and description are required' });
      return;
    }
    const existing = await List.findOne({ slug });
    if (existing) {
      res.status(409).json({ error: `A list with slug "${slug}" already exists` });
      return;
    }
    const list = await List.create({ slug, title, category, description, items: items ?? [] });
    res.status(201).json(list);
  } catch (err) {
    console.error('Error creating list:', err);
    res.status(500).json({ error: 'Failed to create list' });
  }
});

// PUT /api/lists/:slug - replace a list entirely
router.put('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug, title, category, description, items } = req.body;
    if (!title || !category || !description) {
      res.status(400).json({ error: 'title, category, and description are required' });
      return;
    }
    // If slug in body differs from URL slug, ensure the new slug is not taken
    const newSlug = slug ?? req.params.slug;
    if (newSlug !== req.params.slug) {
      const existing = await List.findOne({ slug: newSlug });
      if (existing) {
        res.status(409).json({ error: `A list with slug "${newSlug}" already exists` });
        return;
      }
    }
    const list = await List.findOneAndUpdate(
      { slug: req.params.slug },
      { slug: newSlug, title, category, description, items: items ?? [] },
      { new: true, runValidators: true }
    );
    if (!list) {
      res.status(404).json({ error: 'List not found' });
      return;
    }
    res.json(list);
  } catch (err) {
    console.error('Error updating list:', err);
    res.status(500).json({ error: 'Failed to update list' });
  }
});

// DELETE /api/lists/:slug - delete a list
router.delete('/:slug', async (req: Request, res: Response) => {
  try {
    const list = await List.findOneAndDelete({ slug: req.params.slug });
    if (!list) {
      res.status(404).json({ error: 'List not found' });
      return;
    }
    res.json({ message: 'List deleted' });
  } catch (err) {
    console.error('Error deleting list:', err);
    res.status(500).json({ error: 'Failed to delete list' });
  }
});

export default router;
