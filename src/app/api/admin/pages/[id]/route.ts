import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAdmin } from '@/lib/check-admin';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = await checkAdmin();
  if ('error' in adminCheck) return NextResponse.json({ error: adminCheck.error }, { status: 403 });
  const { id } = await params;

  try {
    const data = await req.json();
    const { slug, title, contentHtml, isPublished, isPublic } = data;

    const page = await prisma.customPage.update({
      where: { id },
      data: {
        slug,
        title,
        contentHtml,
        isPublished,
        isPublic,
      }
    });

    return NextResponse.json({ page });
  } catch (error: any) {
    console.error('Error updating page:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A page with this URL slug already exists.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update page' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = await checkAdmin();
  if ('error' in adminCheck) return NextResponse.json({ error: adminCheck.error }, { status: 403 });
  const { id } = await params;

  try {
    await prisma.customPage.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting page:', error);
    return NextResponse.json({ error: 'Failed to delete page' }, { status: 500 });
  }
}
