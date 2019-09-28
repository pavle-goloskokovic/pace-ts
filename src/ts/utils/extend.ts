const extend = (
    out: { [index: string]: any },
    ...sources: { [index: string]: any }[]
): typeof out =>
{
    for (const source of sources)
    {
        if (source)
        {
            for (const key of Object.keys(source))
            {
                const val = source[key];

                if (out[key] && (typeof out[key] === 'object') &&
                    val && (typeof val === 'object'))
                {
                    extend(out[key], val);
                }
                else
                {
                    out[key] = val;
                }
            }
        }
    }

    return out;
};

export default extend;
