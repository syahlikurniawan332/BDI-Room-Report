INSERT INTO app_settings (setting_key, setting_value, description) VALUES
('organization_name', 'Balai Diklat Industri Medan', 'Nama organisasi yang ditampilkan di aplikasi'),
('timezone', 'Asia/Jakarta', 'Zona waktu aplikasi'),
('photo_retention_days', '90', 'Masa simpan foto laporan dan pengaduan setelah dikirim'),
('draft_retention_days', '14', 'Draft tidak aktif dihapus setelah jumlah hari ini'),
('inactive_reminder_working_days', '3', 'Email admin dikirim setelah CS tidak mengirim selama jumlah hari kerja ini'),
('inactive_reminder_hour_wib', '08:00', 'Jam pengiriman pengingat dalam WIB'),
('max_complaint_photos', '1', 'Maksimum foto pada satu pengaduan anonim'),
('max_report_before_photos', '1', 'Jumlah foto before aktif per laporan'),
('max_report_after_photos', '1', 'Jumlah foto after aktif per laporan');
