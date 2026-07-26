update storage.buckets
set
  file_size_limit = 20971520,
  allowed_mime_types = array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ]
where id = 'material-documents';
