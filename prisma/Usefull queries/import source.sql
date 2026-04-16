ELECT
  created_at,
  status_code,
  json_extract(metadata_json, '$.sourceType') AS source_type,
  json_extract(metadata_json, '$.outcome') AS outcome,
  json_extract(metadata_json, '$.errorCode') AS error_code,
  json_extract(metadata_json, '$.latencyMs') AS latency_ms,
  json_extract(metadata_json, '$.ocrDriver') AS ocr_driver,
  json_extract(metadata_json, '$.usedFallback') AS used_fallback
FROM MetricEvent
WHERE metric_name = 'recipe_import_parse'
ORDER BY created_at DESC
LIMIT 20;