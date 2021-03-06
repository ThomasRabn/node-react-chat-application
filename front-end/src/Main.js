import {useContext} from 'react'
import {
  Route,
  Switch,
} from 'react-router-dom'
/** @jsx jsx */
import { jsx } from '@emotion/core'
// Layout
import { useTheme } from '@material-ui/core/styles'
// Core components
import { useMediaQuery, Drawer } from '@material-ui/core/'
// Local
import Context from './Context'
import Channels from './Channels'
import Channel from './Channel'
import Welcome from './Welcome'
import Settings from './Settings'

const useStyles = (theme) => ({
  root: {
    backgroundColor: '#484848',
    overflow: 'hidden',
    flex: '1 1 auto',
    display: 'flex',
    flexDirection: 'row',
    position: 'relative',
  },
  drawer: {
    width: '200px',
    display: 'none',
  },
  drawerVisible: {
    display: 'block',
  },
})

/******** Webpage Architecture ********/
export default () => {
  const {
    drawerVisible,
  } = useContext(Context)
  const theme = useTheme()
  const styles = useStyles(theme)
  const alwaysOpen = useMediaQuery(theme.breakpoints.up('sm'))
  const isDrawerVisible = alwaysOpen || drawerVisible
  return (
    <main css={styles.root}>
      <Drawer
        PaperProps={{ style: { position: 'relative' } }}
        BackdropProps={{ style: { position: 'relative' } }}
        ModalProps={{
          style: { position: 'relative' }
        }}
        variant="persistent"
        open={isDrawerVisible}
        css={[styles.drawer, isDrawerVisible && styles.drawerVisible]}
      >
        <Channels />
      </Drawer>
      <Switch>
        <Route path="/channels/:id">
          <Channel />
        </Route>
        <Route path="/settings">
          <Settings />
        </Route>
        <Route path="/">
          <Welcome />
        </Route>
      </Switch>
    </main>
  );
}
