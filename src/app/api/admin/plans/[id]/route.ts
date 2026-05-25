import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    const { name, description, cost, isArchived } = body;

    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (description !== undefined) dataToUpdate.description = description;
    if (cost !== undefined) dataToUpdate.cost = cost;
    if (isArchived !== undefined) dataToUpdate.isArchived = isArchived;

    const plan = await prisma.membershipPlan.update({
      where: { id },
      data: dataToUpdate
    });

    return NextResponse.json({ plan }, { status: 200 });
  } catch (error: any) {
    console.error('Update plan error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A plan with this name already exists' }, { status: 400 });
    }
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
