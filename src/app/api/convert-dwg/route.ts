import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

const execAsync = promisify(exec);

/**
 * Converts an uploaded DWG file to DXF using LibreDWG's `dwg2dxf` CLI.
 * Requires `brew install libredwg` (provides /usr/local/bin/dwg2dxf).
 * Returns the DXF text so the client can feed it into the existing importer.
 */
export async function POST(request: NextRequest) {
  let workDir: string | null = null;
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith('.dwg')) {
      return NextResponse.json({ error: 'Please upload a .dwg file.' }, { status: 400 });
    }

    // Write the upload to a temp working directory
    workDir = await mkdtemp(join(tmpdir(), 'buildai-dwg-'));
    const inputPath = join(workDir, 'input.dwg');
    const outputPath = join(workDir, 'input.dxf');

    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(inputPath, bytes);

    // Run the converter. dwg2dxf writes <name>.dxf next to the input by default,
    // but we pass an explicit output for clarity.
    try {
      await execAsync(`dwg2dxf -y -o "${outputPath}" "${inputPath}"`, {
        timeout: 30000,
        maxBuffer: 1024 * 1024 * 64,
      });
    } catch (convErr) {
      const msg = convErr instanceof Error ? convErr.message : String(convErr);
      // Common case: tool not installed
      if (msg.includes('command not found') || msg.includes('ENOENT')) {
        return NextResponse.json(
          {
            error:
              'DWG converter not installed on the server. Run "brew install libredwg".',
          },
          { status: 501 }
        );
      }
      return NextResponse.json(
        { error: 'Could not convert this DWG file. It may use an unsupported version.' },
        { status: 422 }
      );
    }

    let dxf: string;
    try {
      dxf = await readFile(outputPath, 'utf-8');
    } catch {
      return NextResponse.json(
        { error: 'Conversion produced no output. The DWG may be corrupt or unsupported.' },
        { status: 422 }
      );
    }

    if (!dxf || dxf.trim().length === 0) {
      return NextResponse.json(
        { error: 'Conversion produced an empty file.' },
        { status: 422 }
      );
    }

    return NextResponse.json({ dxf });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'DWG conversion failed';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    if (workDir) {
      await rm(workDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
