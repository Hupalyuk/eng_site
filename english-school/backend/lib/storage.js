const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const uploadsDir = path.join(__dirname, '..', 'uploads');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseBucket = process.env.SUPABASE_BUCKET || 'uploads';

const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : null;

function isSupabaseStorageEnabled() {
  return Boolean(supabase);
}

function safeExtension(fileName = '') {
  return path.extname(fileName).toLowerCase().replace(/[^a-z0-9.]/g, '');
}

function makeStoragePath(folder, fileName) {
  const ext = safeExtension(fileName);
  const safeFolder = String(folder || 'uploads')
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^a-zA-Z0-9/_-]/g, '-');
  return `${safeFolder}/${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
}

async function saveUploadedFile(file, { folder = 'uploads' } = {}) {
  if (!file) return null;

  if (supabase) {
    const storagePath = makeStoragePath(folder, file.originalname);
    const { error } = await supabase.storage.from(supabaseBucket).upload(storagePath, file.buffer, {
      contentType: file.mimetype || 'application/octet-stream',
      upsert: false,
    });

    if (error) {
      throw new Error(error.message || 'Could not upload file to Supabase Storage.');
    }

    const { data } = supabase.storage.from(supabaseBucket).getPublicUrl(storagePath);
    return {
      url: data.publicUrl,
      storagePath,
      storage: 'supabase',
    };
  }

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const storagePath = makeStoragePath(folder, file.originalname);
  const localName = storagePath.replace(/[\\/]/g, '-');
  await fs.promises.writeFile(path.join(uploadsDir, localName), file.buffer);

  return {
    url: `/uploads/${localName}`,
    storagePath: localName,
    storage: 'local',
  };
}

async function deleteStoredFile(fileUrl) {
  const value = String(fileUrl || '').trim();
  if (!value) return;

  if (supabase && supabaseUrl && value.startsWith(supabaseUrl)) {
    const marker = `/storage/v1/object/public/${supabaseBucket}/`;
    const markerIndex = value.indexOf(marker);
    if (markerIndex === -1) return;

    const storagePath = decodeURIComponent(value.slice(markerIndex + marker.length).split('?')[0]);
    if (storagePath) {
      await supabase.storage.from(supabaseBucket).remove([storagePath]);
    }
    return;
  }

  if (value.startsWith('/uploads/')) {
    const relative = value.replace(/^\/+/, '');
    const absPath = path.join(__dirname, '..', relative);
    fs.unlink(absPath, () => {});
  }
}

module.exports = {
  deleteStoredFile,
  isSupabaseStorageEnabled,
  saveUploadedFile,
};
