import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import List from '@/lib/models/List';

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await connectDB();
    const { slug } = await params;
    const list = await List.findOne({ slug }).lean();
    if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 });
    return NextResponse.json(list);
  } catch (err) {
    console.error('Error fetching list:', err);
    return NextResponse.json({ error: 'Failed to fetch list' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    await connectDB();
    const { slug: urlSlug } = await params;
    const { slug, title, category, description, items } = await request.json();
    if (!title || !category || !description) {
      return NextResponse.json(
        { error: 'title, category, and description are required' },
        { status: 400 }
      );
    }
    const newSlug = slug ?? urlSlug;
    if (newSlug !== urlSlug) {
      const existing = await List.findOne({ slug: newSlug });
      if (existing) {
        return NextResponse.json(
          { error: `A list with slug "${newSlug}" already exists` },
          { status: 409 }
        );
      }
    }
    const list = await List.findOneAndUpdate(
      { slug: urlSlug },
      { slug: newSlug, title, category, description, items: items ?? [] },
      { new: true, runValidators: true }
    );
    if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 });
    return NextResponse.json(list);
  } catch (err) {
    console.error('Error updating list:', err);
    return NextResponse.json({ error: 'Failed to update list' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await connectDB();
    const { slug } = await params;
    const list = await List.findOneAndDelete({ slug });
    if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 });
    return NextResponse.json({ message: 'List deleted' });
  } catch (err) {
    console.error('Error deleting list:', err);
    return NextResponse.json({ error: 'Failed to delete list' }, { status: 500 });
  }
}
