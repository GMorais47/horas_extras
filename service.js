const { Service } = require('node-windows');
const path = require('path');
const readline = require('readline');
const { exec } = require('child_process');

const projectDir = path.resolve(__dirname);
const scriptPath = path.join(projectDir, 'dist/main.js');

const svc = new Service({
    name: 'HorasExtrasGoianinho',
    description: 'Serviço do Windows para controle de Horas Extras do Goianinho.',
    script: scriptPath,
    nodeOptions: [
        '--harmony',
        '--max_old_space_size=4096'
    ],
    workingDirectory: projectDir, 
    env: [
        { name: 'NODE_ENV', value: 'production' },
        { name: 'PORTA', value: process.env.PORTA || '3000' },
        { name: 'AGENDAMENTO', value: process.env.AGENDAMENTO || '10 0 * * *' },
        { name: 'PATH_OUTPUT', value: process.env.PATH_OUTPUT || 'C:\\Users\\User\\Desktop' },
        { name: 'DISPOSITIVO_ENDERECO', value: process.env.DISPOSITIVO_ENDERECO || 'http://192.168.1.175:80' },
        { name: 'DISPOSITIVO_USUARIO', value: process.env.DISPOSITIVO_USUARIO || 'admin' },
        { name: 'DISPOSITIVO_SENHA', value: process.env.DISPOSITIVO_SENHA || 'admin' },
        { name: 'HORA_VALOR', value: process.env.HORA_VALOR || '15' }
    ],
    user: {
        account: process.env.WINDOWS_USUARIO,
        password: process.env.WINDOWS_SENHA
    }
});

function runNpmStart() {
    exec('npm run start', { cwd: projectDir }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Erro ao iniciar o servidor: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
    });
}

function installService() {
    svc.on('install', () => {
        console.log('Serviço instalado com sucesso!');
        runNpmStart();
    });

    svc.install();
}

function uninstallService() {
    svc.on('uninstall', () => {
        console.log('Serviço desinstalado com sucesso!');
    });

    svc.uninstall();
}

function checkServiceStatus() {
    exec(`sc query HorasExtrasGoianinho`, (error, stdout, stderr) => {
        if (error) {
            console.log('O serviço NÃO está instalado ou ocorreu um erro ao verificar.');
            showOptions();
        } else {
            console.log('O serviço está instalado.');
            showOptions();
        }
    });
}

function showOptions() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('Deseja (I)niciar a instalação ou (D)esinstalar o serviço? (I/D): ', (answer) => {
        if (answer.toLowerCase() === 'i') {
            installService();
        } else if (answer.toLowerCase() === 'd') {
            uninstallService();
        } else {
            console.log('Opção inválida. Por favor, escolha "I" para instalar ou "D" para desinstalar.');
        }
        rl.close();
    });
}

checkServiceStatus();
