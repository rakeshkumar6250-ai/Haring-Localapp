import { NextResponse } from 'next/server';
import { getCandidates } from '@/lib/mongodb';
import { writeFile, mkdir, access, constants } from 'fs/promises';
import path from 'path';

const ID_DIR = path.join(process.cwd(), 'public', 'id-docs');

async function ensureIdDir() {
  try {
    await access(ID_DIR, constants.W_OK);
  } catch {
    await mkdir(ID_DIR, { recursive: true, mode: 0o777 });
  }
}

export async function POST(request) {
  try {
    await ensureIdDir();
    const formData = await request.formData();
    const file = formData.get('document');
    const candidateId = formData.get('candidate_id');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No document file provided' }, { status: 400 });
    }
    if (!candidateId) {
      return NextResponse.json({ error: 'candidate_id is required' }, { status: 400 });
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Only PDF, JPG, PNG files are accepted' }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be under 5MB' }, { status: 400 });
    }

    const ext = file.type === 'application/pdf' ? 'pdf' : file.type.includes('png') ? 'png' : 'jpg';
    const fileName = `${candidateId}_id_${Date.now()}.${ext}`;
    const filePath = path.join(ID_DIR, fileName);

    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    const documentUrl = `/id-docs/${fileName}`;

    const candidates = await getCandidates();
    await candidates.updateOne(
      { _id: candidateId },
      { $set: { id_document_url: documentUrl, verification_status: 'Pending', updated_at: new Date() } }
    );

    console.log(`[CANDIDATE KYC] ID uploaded for ${candidateId}: ${documentUrl}`);

    return NextResponse.json({
      success: true,
      candidate_id: candidateId,
      document_url: documentUrl,
      verification_status: 'Pending',
      message: 'ID uploaded. Verification pending.'
    }, { status: 201 });
  } catch (error) {
    console.error('Candidate ID upload error:', error);
    return NextResponse.json({ error: 'Failed to upload ID', details: error.message }, { status: 500 });
  }
}
