import {useContext, useEffect} from 'react'
import axios from 'axios'
import {useHistory} from 'react-router-dom'
/** @jsx jsx */
import { jsx } from '@emotion/core'
// Core components
import {
  Link, IconButton
} from '@material-ui/core'
// Icons
import HomeIcon from '@material-ui/icons/HomeTwoTone'
// Local
import Context from './Context'
import CreateChannel from './CreateChannel'
import 'reactjs-popup/dist/index.css'

const styles = {
  channels: {
    paddingRight: '1em',
    paddingLeft: '1em',
    paddingTop: '1em'
  },
  channel: {
    padding: '.2rem .5rem',
    whiteSpace: 'nowrap', 
    color: 'white',
    fontWeight: 'bold',
    fontSize: '1.2em'
  },
  largeIcon: {
    fontSize: '2em',
  }
}
/******** Component for the Channel's list on screen's left side ********/
export default () => {
  const {
    oauth,
    channels, setChannels
  } = useContext(Context)
  const history = useHistory();
  useEffect( () => {
    const fetch = async () => {
      try{
        let {data: channels} = await axios.get('http://localhost:3001/channels', {
          headers: {
            'Authorization': `Bearer ${oauth.access_token}`
          }
        })
        channels = channels.sort((a, b) => {
          return a.name < b.name ? -1 : 1;
        })
        console.log(channels)
        setChannels(channels)
      }catch(err){
        console.error(err)
      }
    }
    fetch()
  }, [oauth, setChannels])
  return (
    <ul style={styles.channels}>
      <li style={styles.channel} css={{textAlign: 'center'}} >
        <IconButton
          href={`/channels`}
          onClick={ (e) => {
            e.preventDefault()
            history.push(`/channels`)
          }}
        >
          <HomeIcon style={styles.largeIcon} />
        </IconButton> 
      </li>
      { channels.map( (channel, i) => (
        <li key={i} style={styles.channel}>
          <Link
            href={`/channels/${channel.id}`}
            onClick={ (e) => {
              e.preventDefault()
              history.push(`/channels/${channel.id}`)
            }}
            style={{color: 'white'}}
          >
            {channel.name}
          </Link>
        </li>
      ))}
      <li style={styles.channel}>
        <CreateChannel>Add a channel</CreateChannel>
      </li>
    </ul>
  );
}
