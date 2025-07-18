'use client'

import { appStore } from '@/app/store'
import { Button } from '@/components/ui/button'
import { useChatModels } from '@/hooks/use-chat-models'
import { ChatModel } from '@/types/chat'
import { ChevronDown } from 'lucide-react'
import { Fragment, PropsWithChildren, useEffect, useState } from 'react'

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'

interface SelectModelProps {
  onSelect: (model: ChatModel) => void
  align?: 'start' | 'end'
  defaultModel?: ChatModel
}

export const SelectModel = (props: PropsWithChildren<SelectModelProps>) => {
  const [open, setOpen] = useState(false)
  const { data: providers } = useChatModels()
  const [model, setModel] = useState(props.defaultModel)

  useEffect(() => {
    setModel(props.defaultModel ?? appStore.getState().chatModel)
  }, [props.defaultModel])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {props.children || (
          <Button
            variant={'secondary'}
            size={'sm'}
            className="hover:bg-input! data-[state=open]:bg-input!"
          >
            <p className="mr-auto">
              {model?.model ?? (
                <span className="text-muted-foreground">model</span>
              )}
            </p>
            <ChevronDown className="size-3" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align={props.align || 'end'}>
        <Command
          className="relative h-80 rounded-lg shadow-md"
          value={JSON.stringify(model)}
          onClick={e => e.stopPropagation()}
        >
          <CommandInput placeholder="search model..." />
          <CommandList className="p-2">
            <CommandEmpty>No results found.</CommandEmpty>
            {providers?.map((provider, i) => (
              <Fragment key={provider.provider}>
                <CommandGroup
                  heading={provider.provider}
                  className="pb-4"
                  onWheel={e => {
                    e.stopPropagation()
                  }}
                >
                  {provider.models.map(model => (
                    <CommandItem
                      key={model.name}
                      className="cursor-pointer"
                      onSelect={() => {
                        setModel({
                          provider: provider.provider,
                          model: model.name
                        })
                        props.onSelect({
                          provider: provider.provider,
                          model: model.name
                        })
                        setOpen(false)
                      }}
                      value={model.name}
                    >
                      <span className="px-2">
                        {model.name.split('/').pop()}
                      </span>
                      {model.isToolCallUnsupported && (
                        <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                          No tools
                        </div>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
                {i < providers?.length - 1 && <CommandSeparator />}
              </Fragment>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
