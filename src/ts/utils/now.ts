const now = (): number =>
{
    if (performance && performance.now)
    {
        return performance.now();
    }

    return +new Date;
};

export default now;
