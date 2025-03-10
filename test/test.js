const fs = require('fs').promises;
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

const API_URL = 'http://localhost:3000';

async function runTests() {
    console.log('Starting tests...\n');

    // 测试1：上传有效EPUB文件
    try {
        console.log('Test 1: Uploading valid EPUB file');
        const form = new FormData();
        const file = await fs.readFile(path.join(__dirname, 'test.epub'));
        form.append('file', file, 'test.epub');
        form.append('level', 'medium');

        const response = await fetch(`${API_URL}/api/compress`, {
            method: 'POST',
            body: form
        });

        const result = await response.json();
        console.log('Response:', result);
        
        if (result.downloadUrl) {
            console.log('✅ File upload and compression successful');
            
            // 测试下载
            console.log('\nTesting download...');
            const downloadResponse = await fetch(`${API_URL}${result.downloadUrl}`);
            if (downloadResponse.ok) {
                console.log('✅ File download successful');
            } else {
                console.log('❌ File download failed');
            }
        } else {
            console.log('❌ File upload failed');
        }
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }

    // 测试2：上传无效文件类型
    try {
        console.log('\nTest 2: Uploading invalid file type');
        const form = new FormData();
        const file = Buffer.from('test data');
        form.append('file', file, 'test.txt');
        form.append('level', 'medium');

        const response = await fetch(`${API_URL}/api/compress`, {
            method: 'POST',
            body: form
        });

        const result = await response.json();
        console.log('Response:', result);
        
        if (response.status === 400) {
            console.log('✅ Invalid file type correctly rejected');
        } else {
            console.log('❌ Invalid file type not properly handled');
        }
    } catch (error) {
        console.log('✅ Invalid file correctly rejected:', error.message);
    }

    // 测试3：测试不同压缩级别
    try {
        console.log('\nTest 3: Testing compression levels');
        const levels = ['low', 'medium', 'high'];
        const file = await fs.readFile(path.join(__dirname, 'test.epub'));

        for (const level of levels) {
            console.log(`\nTesting ${level} compression level:`);
            const form = new FormData();
            form.append('file', file, 'test.epub');
            form.append('level', level);

            const response = await fetch(`${API_URL}/api/compress`, {
                method: 'POST',
                body: form
            });

            const result = await response.json();
            console.log(`Compression ratio: ${result.compressionRatio}%`);
            if (result.downloadUrl) {
                console.log(`✅ ${level} compression successful`);
            } else {
                console.log(`❌ ${level} compression failed`);
            }
        }
    } catch (error) {
        console.error('❌ Compression level test failed:', error.message);
    }

    console.log('\nTests completed.');
}

// 运行测试
runTests().catch(console.error); 