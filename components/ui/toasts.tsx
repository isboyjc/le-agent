'use client'

import JsonView from '@/components/ui/json-view'
import { errorToString } from '@/lib/utils'
import { toast } from 'sonner'

export const notImplementedToast = (
  notImplementedText?: string,
  comingSoonText?: string
) => {
  toast.warning(
    <div className="flex flex-col gap-2">
      <span className="font-semibold">{notImplementedText}</span>
      <span className="text-xs text-muted-foreground">{comingSoonText}</span>
    </div>
  )
}

export const handleErrorWithToast = (error: Error, id?: string) => {
  toast.error(`${error?.name || 'Error'}`, {
    description: (
      <div className="my-4 max-h-[340px] overflow-y-auto">
        <JsonView data={errorToString(error)} />
      </div>
    ),
    id
  })

  return error
}
