import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import List from '@/lib/models/List';

export async function GET() {
  try {
    await connectDB();
    const lists = await List.find({}, { items: 0 }).lean();
    return NextResponse.json(lists);
  } catch (err) {
    console.error('Error fetching lists:', err);
    return NextResponse.json({ error: 'Failed to fetch lists' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();
    const { slug, title, category, description, items } = await request.json();
    if (!slug || !title || !category || !description) {
      return NextResponse.json(
        { error: 'slug, title, category, and description are required' },
        { status: 400 }
      );
    }
    const existing = await List.findOne({ slug });
    if (existing) {
      return NextResponse.json(
        { error: `A list with slug "${slug}" already exists` },
        { status: 409 }
      );
    }
    const list = await List.create({ slug, title, category, description, items: items ?? [] });
    return NextResponse.json(list, { status: 201 });
  } catch (err) {
    console.error('Error creating list:', err);
    return NextResponse.json({ error: 'Failed to create list' }, { status: 500 });
  }
}
