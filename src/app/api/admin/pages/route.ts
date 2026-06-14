import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAdmin } from '@/lib/check-admin';

export async function GET() {
  const adminCheck = await checkAdmin();
  if ('error' in adminCheck) return NextResponse.json({ error: adminCheck.error }, { status: 403 });

  try {
    const pages = await prisma.customPage.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ pages });
  } catch (error) {
    console.error('Error fetching pages:', error);
    return NextResponse.json({ error: 'Failed to fetch pages' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const adminCheck = await checkAdmin();
  if ('error' in adminCheck) return NextResponse.json({ error: adminCheck.error }, { status: 403 });

  try {
    const data = await req.json();
    const { slug, title, contentHtml, isPublished, isPublic } = data;

    if (!slug || !title) {
      return NextResponse.json({ error: 'Slug and title are required' }, { status: 400 });
    }

    const page = await prisma.customPage.create({
      data: {
        slug,
        title,
        contentHtml,
        isPublished: isPublished ?? true,
        isPublic: isPublic ?? true,
      }
    });

    return NextResponse.json({ page });
  } catch (error: any) {
    console.error('Error creating page:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A page with this URL slug already exists.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create page' }, { status: 500 });
  }
}
