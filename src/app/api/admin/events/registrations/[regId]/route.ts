import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(request: Request, { params }: { params: Promise<{ regId: string }> }) {
  try {
    const { regId } = await params;
    const body = await request.json();
    
    if (!regId) {
      return NextResponse.json({ error: 'Registration ID is required' }, { status: 400 });
    }

    const updated = await prisma.eventRegistration.update({
      where: { id: regId },
      data: {
        hasPaid: body.hasPaid
      }
    });

    return NextResponse.json({ registration: updated }, { status: 200 });
  } catch (error) {
    console.error('Update event registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ regId: string }> }) {
  try {
    const { regId } = await params;
    
    if (!regId) {
      return NextResponse.json({ error: 'Registration ID is required' }, { status: 400 });
    }

    await prisma.eventRegistration.delete({
      where: { id: regId }
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Delete event registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
