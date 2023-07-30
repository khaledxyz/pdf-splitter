const fs = require('fs');
const path = require('path');
const pdf = require('pdf-poppler');
const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');

const inputDir = './input.pdf';
const tempDir = './src/temp';
const tempDir2 = './src/temp2';
const outputDir = './output';

const checkAndCreateDir = async (dir) => {
    try {
        if (!fs.existsSync(dir)) {
            await fs.promises.mkdir(dir);
        }
    } catch (e) {
        fs.appendFileSync('errors.log.txt', `${e}\n`);
    }
}

const cleanDir = async (dir) => {
    try {
        const files = await fs.promises.readdir(dir);
        for (const file of files)
            await fs.promises.unlink(path.join(dir, file));
    } catch (e) {
        fs.appendFileSync('errors.log.txt', `${e}\n`);
    }
}

const convertPdfToPng = async () => {
    let opts = {
        format: 'png',
        out_dir: path.resolve('./src/temp'),
        out_prefix: path.basename(path.resolve('./input'), path.extname(path.resolve('./input'))),
        page: null
    }

    try {
        await pdf.convert(path.resolve('./input.pdf'), opts);
    } catch (e) {
        fs.appendFileSync('errors.log.txt', `${e}\n`);
    }
}

const splitImages = async () => {
    try {
        const pngFiles = await fs.promises.readdir(tempDir);
        await Promise.all(pngFiles.map(async (file, index) => {
            const inputPath = path.join(tempDir, file);
            const outputPathLeft = path.join(tempDir2, `${index + 1}_1.png`);
            const outputPathRight = path.join(tempDir2, `${index + 1}_2.png`);

            const metadata = await sharp(inputPath).metadata();
            const halfWidth = Math.floor(metadata.width / 2);

            const promiseLeft = sharp(inputPath)
                .extract({ left: 0, top: 0, width: halfWidth, height: metadata.height })
                .toFile(outputPathLeft);

            const promiseRight = sharp(inputPath)
                .extract({ left: halfWidth, top: 0, width: halfWidth, height: metadata.height })
                .toFile(outputPathRight);

            await Promise.all([promiseLeft, promiseRight]);
        }));
    } catch (e) {
        fs.appendFileSync('errors.log.txt', `${e}\n`);
        console.error('Error while splitting images:', e);
    }
};



const createPDF = async () => {
    try {
        const pdfDoc = await PDFDocument.create();

        const pngFiles = fs
            .readdirSync(tempDir2)
            .filter(file => path.extname(file) === '.png')
            .sort((a, b) => {
                const [aIndex] = a.split('_');
                const [bIndex] = b.split('_');
                return parseInt(aIndex) - parseInt(bIndex);
            });

        for (const file of pngFiles) {
            const inputPath = path.join(tempDir2, file);
            const image = await pdfDoc.embedPng(fs.readFileSync(inputPath));
            const page = pdfDoc.addPage([image.width, image.height]);
            const { width, height } = page.getSize();
            page.drawImage(image, {
                x: 0,
                y: 0,
                width,
                height,
            });
        }

        const pdfBytes = await pdfDoc.save();

        // Write the PDF to the 'outputDir' directory
        fs.writeFileSync(`${outputDir}/output.pdf`, pdfBytes);

        console.log('PDF file successfully created at:', outputDir);
    } catch (error) {
        console.error('Error while creating PDF:', error);
        fs.appendFileSync('errors.log.txt', `${error}\n`);
    }
};

const loadingAnimation = (message, duration) => {
    const frames = ['-', '/', '|', '\\'];
    let frameIndex = 0;

    const animationInterval = setInterval(() => {
        process.stdout.write(`\r${message} ${frames[frameIndex]}`);
        frameIndex = (frameIndex + 1) % frames.length;
    }, duration);

    return animationInterval;
};


const run = async () => {
    console.log('Worker Started. Please wait...');
    const loadingInterval = loadingAnimation('Processing', 100);

    if (!fs.existsSync(inputDir)) {
        console.log('Error: input.pdf does not exist');
        fs.appendFileSync('errors.log.txt', 'Error: input.pdf does not exist\n');
        clearInterval(loadingInterval);
        return;
    }

    await checkAndCreateDir(tempDir);
    await checkAndCreateDir(tempDir2);
    await checkAndCreateDir(outputDir);

    await cleanDir(tempDir);
    await cleanDir(tempDir2);
    await cleanDir(outputDir);

    await convertPdfToPng();
    await splitImages();
    await createPDF();

    await cleanDir(tempDir);
    await cleanDir(tempDir2);

    clearInterval(loadingInterval);
    console.log('Worker finished.');
}

run();
