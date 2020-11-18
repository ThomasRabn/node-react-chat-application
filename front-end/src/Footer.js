/** @jsx jsx */
import { jsx } from '@emotion/core';
import { useTheme } from '@material-ui/core/styles';


const useStyles = (theme) => ({
    footer: {
        height: '30px',
        backgroundColor: theme.palette.background.default,
        flexShrink: 0,
        color: 'grey',
    },
    centerOuter: {
        marginLeft: 'auto',
        marginRight: 'auto',
    },
    centerInner: {
        textAlign: 'center',
        fontWeight: '400',
    }
});

export default () => {
    const styles = useStyles(useTheme())
    return (
        <footer className="App-footer" style={styles.footer}>
            <div css={styles.centerOuter}>
                <div css={styles.centerInner}>Copyright © 2020 <a css={{fontStyle: 'italic'}}>Thomas&Thomas</a>. All rights reserved.</div>
            </div>
        </footer>
    );
}
