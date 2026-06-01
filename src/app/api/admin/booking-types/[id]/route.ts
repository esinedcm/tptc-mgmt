import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, color } = body;

    if (!id) {
      return NextResponse.json({ error: 'Booking Type ID is required' }, { status: 400 });
    }

    const existingType = await prisma.bookingType.findUnique({ where: { id } });
    if (!existingType) {
      return NextResponse.json({ error: 'Booking Type not found' }, { status: 404 });
    }

    const dataToUpdate: any = { color };
    
    // Only allow name change if it's not built-in
    if (!existingType.isBuiltIn && name) {
      dataToUpdate.name = name.toUpperCase().trim();
    }

    const updatedBookingType = await prisma.bookingType.update({
      where: { id },
      data: dataToUpdate
    });

    return NextResponse.json({ bookingType: updatedBookingType }, { status: 200 });
  } catch (error: any) {
    console.error('Update booking type error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A booking type with this name already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ error: 'Booking Type ID is required' }, { status: 400 });
    }

    const existingType = await prisma.bookingType.findUnique({ where: { id } });
    
    if (!existingType) {
      return NextResponse.json({ error: 'Booking Type not found' }, { status: 404 });
    }

    if (existingType.isBuiltIn) {
      return NextResponse.json({ error: 'Cannot delete a built-in booking type' }, { status: 400 });
    }

    await prisma.bookingType.delete({
      where: { id }
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Delete booking type error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
