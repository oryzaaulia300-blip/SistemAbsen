const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = 3000;

// Konfigurasi koneksi ke pgAdmin (PostgreSQL)
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'SistemAbsen',
    password: 'PW PG ADMIN', //Pw pg admin sendiri 
    port: 5432,
});

// Middleware untuk membaca format JSON
app.use(express.json());

// Menyajikan file statis (HTML/CSS) dari folder 'public'
app.use(express.static(path.join(__dirname, 'public')));

// 1. API: Mengambil daftar seluruh siswa
app.get('/api/siswa', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM siswa');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Terjadi kesalahan server');
    }
});

// 2. API: Mencatat dan menyimpan data absen ke database
app.post('/api/absen', async (req, res) => {
    const { siswa_id, status } = req.body;
    
    try {
        await pool.query(
            'INSERT INTO kehadiran (siswa_id, tanggal, status) VALUES ($1, CURRENT_DATE, $2)',
            [siswa_id, status]
        );
        res.json({ success: true, message: 'Absen berhasil disimpan!' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ success: false, message: 'Gagal menyimpan absen' });
    }
});

// 3. API: Mengambil detail lengkap siswa (Identitas, Nilai, & Riwayat Absen) berdasarkan NIS
app.get('/api/siswa/detail/:nis', async (req, res) => {
    const { nis } = req.params;
    try {
        const siswaQuery = await pool.query('SELECT * FROM siswa WHERE nis = $1', [nis]);
        if (siswaQuery.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'NIS tidak ditemukan!' });
        }
        const siswa = siswaQuery.rows[0];

        // Ambil nilai gabungan dengan tabel mata pelajaran
        const nilaiQuery = await pool.query(
            'SELECT nilai_siswa.*, mata_pelajaran.nama_pelajaran FROM nilai_siswa JOIN mata_pelajaran ON nilai_siswa.mapel_id = mata_pelajaran.id WHERE nilai_siswa.siswa_id = $1',
            [siswa.id]
        );

        // Ambil riwayat kehadiran
        const absenQuery = await pool.query(
            'SELECT * FROM kehadiran WHERE siswa_id = $1 ORDER BY tanggal DESC',
            [siswa.id]
        );

        res.json({
            success: true,
            siswa: siswa,
            nilai: nilaiQuery.rows,
            kehadiran: absenQuery.rows
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Terjadi kesalahan server');
    }
});

// Menyalakan Server
app.listen(port, () => {
    console.log(`Server berhasil berjalan di http://localhost:${port}`);
});
