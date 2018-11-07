let g = () => {
    let iCount = 0;
    const handle = setInterval(() => {
        iCount++;
        console.log('iCount: ', iCount);
        if (iCount > 5) {
            clearInterval(handle);
        }

    }, 5000);
};

g();